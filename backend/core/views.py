from django.contrib.auth.models import User
from django.db.models import Count
from rest_framework import generics
from .models import Announcement, Notification, PostView, SavedAnnouncement
from .serializers import (
    AnnouncementSerializer,
    NotificationSerializer,
    SavedAnnouncementSerializer,
)
from .models import Reaction
from rest_framework import permissions
from .models import Comment
from .serializers import CommentSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import re  # Import regex
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.contrib.auth.hashers import check_password
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User

# Helper to unflatten keys (pet.name -> pet: {name})
def expand_data(data):
    result = {}
    for key, value in data.items():
        if '.' in key:
            parent, child = key.split('.', 1)
            if parent not in result:
                result[parent] = {}
            result[parent][child] = value
        else:
            result[key] = value
    return result


class AnnouncementList(generics.ListCreateAPIView):
    def get_queryset(self):
        queryset = Announcement.objects.select_related(
            "pet",
            "location",
            "owner",
            "owner__profile",
        ).annotate(
            views_count_annotated=Count("post_views", distinct=True)
        )

        status = self.request.query_params.get('status')
        pet_type = self.request.query_params.get('pet_type')
        search = self.request.query_params.get('search')

        if status:
            queryset = queryset.filter(status=status)

        if pet_type:
            queryset = queryset.filter(pet__pet_type__iexact=pet_type)

        if search:
            queryset = queryset.filter(pet__name__icontains=search)

        return queryset

    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    permission_classes = [AllowAny]

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        # 1. Transform the flat FormData into nested JSON
        # e.g. 'pet.name' -> {'pet': {'name': ...}}
        nested_data = expand_data(request.data)

        # 2. Pass this new structure to the serializer
        serializer = self.get_serializer(data=nested_data)
        serializer.is_valid(raise_exception=True)

        # 3. Save with the owner
        self.perform_create(serializer)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)



class AnnouncementDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Announcement.objects.select_related(
        "pet",
        "location",
        "owner",
        "owner__profile",
    ).annotate(
        views_count_annotated=Count("post_views", distinct=True)
    )
    serializer_class = AnnouncementSerializer
    permission_classes = [AllowAny]

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated()]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        self._track_view(request, instance)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_update(self, serializer):
        if self.request.user != self.get_object().owner:
            raise PermissionDenied("You cannot edit this announcement.")
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user != instance.owner:
            raise PermissionDenied("You cannot delete this announcement.")
        instance.delete()

    def _track_view(self, request, announcement):
        if request.user.is_authenticated:
            PostView.objects.get_or_create(
                announcement=announcement,
                user=request.user,
            )
            return

        if not request.session.session_key:
            request.session.create()

        PostView.objects.get_or_create(
            announcement=announcement,
            session_key=request.session.session_key,
        )


class AnnouncementCommentList(generics.ListCreateAPIView):
    serializer_class = CommentSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        announcement_id = self.kwargs.get('announcement_id')
        return Comment.objects.filter(announcement_id=announcement_id).select_related('user', 'user__profile')

    def perform_create(self, serializer):
        announcement_id = self.kwargs.get('announcement_id')
        serializer.save(user=self.request.user, announcement_id=announcement_id)
        # assign badges for the commenter
        try:
            from .utils import check_and_assign_badges
            check_and_assign_badges(self.request.user)
        except Exception:
            pass
        # notify announcement owner about new comment
        try:
            announcement = Announcement.objects.filter(id=announcement_id).first()
            if announcement and announcement.owner_id != self.request.user.id:
                Notification.objects.create(
                    user=announcement.owner,
                    type=Notification.TYPE_COMMENT_ON_ANNOUNCEMENT,
                    title=f"{self.request.user.username} commented on your announcement",
                    related_announcement=announcement,
                )
        except Exception:
            pass


class CommentDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Comment.objects.select_related('user')
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]

    def check_object_permissions(self, request, obj):
        # allow anyone to view, but restrict updates/deletes to owner
        if request.method in ('PUT', 'PATCH', 'DELETE') and obj.user != request.user:
            raise PermissionDenied("You cannot modify this comment.")
        return super().check_object_permissions(request, obj)

    def perform_update(self, serializer):
        # only owner can update => enforced in check_object_permissions
        serializer.save()

    def perform_destroy(self, instance):
        instance.delete()

@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    data = request.data

    try:
        # 🔹 перевірка обов'язкового поля
        if not data.get('phone_number'):
            return Response(
                {'error': 'Phone number is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = User.objects.create_user(
            username=data['username'],
            password=data['password'],
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', '')
        )

        # 🔥 ДОДАЄМО ТЕЛЕФОН У PROFILE
        user.profile.phone_number = data['phone_number']
        user.profile.save()

        return Response(
            {'message': 'User created successfully'},
            status=status.HTTP_201_CREATED
        )

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_announcements(request):
    announcements = Announcement.objects.filter(owner=request.user)

    serializer = AnnouncementSerializer(
        announcements,
        many=True,
        context={'request': request}
    )

    return Response(serializer.data)


@api_view(["POST", "DELETE"])
@permission_classes([IsAuthenticated])
def toggle_save_announcement(request, announcement_id):
    announcement = Announcement.objects.filter(id=announcement_id).first()
    if not announcement:
        return Response({"detail": "Announcement not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "POST":
        _, created = SavedAnnouncement.objects.get_or_create(
            user=request.user,
            announcement=announcement,
        )
        if created and announcement.owner_id != request.user.id:
            Notification.objects.create(
                user=announcement.owner,
                type=Notification.TYPE_POST_SAVED,
                title=f"{request.user.username} saved your announcement",
                related_announcement=announcement,
            )
        # badge check for the saver
        try:
            from .utils import check_and_assign_badges
            check_and_assign_badges(request.user)
        except Exception:
            pass
        return Response({"saved": True})

    SavedAnnouncement.objects.filter(
        user=request.user,
        announcement=announcement,
    ).delete()
    return Response({"saved": False})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_reaction(request, announcement_id):
    kind = request.data.get('kind')
    if kind not in dict(Reaction.KIND_CHOICES):
        return Response({'error': 'Invalid reaction kind'}, status=status.HTTP_400_BAD_REQUEST)

    announcement = Announcement.objects.filter(id=announcement_id).first()
    if not announcement:
        return Response({'error': 'Announcement not found'}, status=status.HTTP_404_NOT_FOUND)

    existing = Reaction.objects.filter(user=request.user, announcement=announcement, kind=kind).first()
    created = False
    if existing:
        existing.delete()
    else:
        Reaction.objects.create(user=request.user, announcement=announcement, kind=kind)
        created = True
        # notify owner and check badges
        if announcement.owner_id != request.user.id:
            Notification.objects.create(
                user=announcement.owner,
                type=Notification.TYPE_POST_LIKED,
                title=f"{request.user.username} reacted to your announcement",
                related_announcement=announcement,
            )
        try:
            from .utils import check_and_assign_badges
            check_and_assign_badges(announcement.owner)
        except Exception:
            pass

    # return counts + user_reaction
    from .models import Reaction as ReactionModel
    qs = ReactionModel.objects.filter(announcement=announcement)
    counts = {k: qs.filter(kind=k).count() for k, _ in ReactionModel.KIND_CHOICES}
    user_reaction = None
    ur = qs.filter(user=request.user).first()
    if ur:
        user_reaction = ur.kind

    return Response({ 'counts': counts, 'user_reaction': user_reaction, 'created': created })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_comment_reaction(request, comment_id):
    kind = request.data.get('kind')
    if kind not in dict(Reaction.KIND_CHOICES):
        return Response({'error': 'Invalid reaction kind'}, status=status.HTTP_400_BAD_REQUEST)

    comment = Comment.objects.filter(id=comment_id).first()
    if not comment:
        return Response({'error': 'Comment not found'}, status=status.HTTP_404_NOT_FOUND)

    # enforce one reaction per user per comment
    existing = Reaction.objects.filter(user=request.user, comment=comment).first()
    created = False
    if existing:
        if existing.kind == kind:
            existing.delete()
            created = False
        else:
            existing.kind = kind
            existing.save()
            created = True
    else:
        Reaction.objects.create(user=request.user, comment=comment, kind=kind)
        created = True
        # notify comment owner
        if comment.user_id != request.user.id:
            try:
                Notification.objects.create(
                    user=comment.user,
                    type=Notification.TYPE_COMMENT_REACTION,
                    title=f"{request.user.username} reacted to your comment",
                    related_announcement=comment.announcement,
                )
            except Exception:
                pass

    qs = Reaction.objects.filter(comment=comment)
    counts = {k: qs.filter(kind=k).count() for k, _ in Reaction.KIND_CHOICES}
    user_reaction = None
    ur = qs.filter(user=request.user).first()
    if ur:
        user_reaction = ur.kind

    return Response({'counts': counts, 'user_reaction': user_reaction, 'created': created})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_saved_announcements(request):
    saved = SavedAnnouncement.objects.filter(user=request.user).select_related(
        "announcement__pet",
        "announcement__location",
        "announcement__owner",
        "announcement__owner__profile",
    )
    serializer = SavedAnnouncementSerializer(
        saved,
        many=True,
        context={"request": request},
    )
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def notifications_list(request):
    queryset = Notification.objects.filter(user=request.user)
    serializer = NotificationSerializer(queryset, many=True)
    unread_count = queryset.filter(is_read=False).count()
    return Response({"results": serializer.data, "unread_count": unread_count})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def notifications_read(request):
    ids = request.data.get("ids") or []
    queryset = Notification.objects.filter(user=request.user, is_read=False)
    if ids:
        queryset = queryset.filter(id__in=ids)
    updated = queryset.update(is_read=True)
    unread_count = Notification.objects.filter(user=request.user, is_read=False).count()
    return Response({"updated": updated, "unread_count": unread_count})

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def current_user(request):

    user = request.user

    if request.method == 'GET':
        # Build profile image URL if it exists
        profile_image_url = None
        if hasattr(user, 'profile') and user.profile.profile_image:
            profile_image_url = request.build_absolute_uri(user.profile.profile_image.url)

        # include badges
        badges = []
        try:
            badges = [
                {"id": ub.badge.id, "name": ub.badge.name, "icon": ub.badge.icon, "awarded_at": ub.awarded_at}
                for ub in user.badges.select_related('badge').all()
            ]
        except Exception:
            badges = []

        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone_number": getattr(user.profile, "phone_number", ""),
            "profile_image_url": profile_image_url,
            "badges": badges,
        })

    if request.method == 'PUT':
        import logging
        logger = logging.getLogger(__name__)

        logger.info(f"📝 PUT request to current_user from user: {user.username}")
        logger.info(f"📦 Request data keys: {request.data.keys()}")
        logger.info(f"📦 Request FILES keys: {request.FILES.keys()}")
        logger.info(f"📦 Full data: {dict(request.data)}")

        # Update username (but don't allow deletion)
        new_username = request.data.get('username', user.username)
        if new_username and new_username.strip():
            user.username = new_username
            logger.info(f"✏️ Updated username to: {new_username}")
        else:
            logger.warning(f"⚠️ Username cannot be empty! Got: '{new_username}'")
            return Response(
                {"error": "Username cannot be empty"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update email (but don't allow deletion)
        new_email = request.data.get('email', user.email)
        if new_email and new_email.strip():
            user.email = new_email
            logger.info(f"✏️ Updated email to: {new_email}")
        else:
            logger.warning(f"⚠️ Email cannot be empty! Got: '{new_email}'")
            return Response(
                {"error": "Email cannot be empty"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update first name
        first_name = request.data.get('first_name', user.first_name)
        if first_name and first_name.strip():
            user.first_name = first_name
            logger.info(f"✏️ Updated first_name to: {first_name}")
        else:
            logger.warning(f"⚠️ First name cannot be empty! Got: '{first_name}'")
            return Response(
                {"error": "First name cannot be empty"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update last name
        last_name = request.data.get('last_name', user.last_name)
        if last_name and last_name.strip():
            user.last_name = last_name
            logger.info(f"✏️ Updated last_name to: {last_name}")
        else:
            logger.warning(f"⚠️ Last name cannot be empty! Got: '{last_name}'")
            return Response(
                {"error": "Last name cannot be empty"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.save()
        logger.info(f"✅ User saved successfully")

        # Handle phone number
        phone = request.data.get('phone_number')
        if phone:
            user.profile.phone_number = phone
            user.profile.save()
            logger.info(f"✏️ Updated phone_number to: {phone}")

        # Handle profile image
        if 'profile_image' in request.FILES:
            logger.info(f"🖼️ Profile image found in FILES!")
            profile_image = request.FILES['profile_image']
            logger.info(f"🖼️ File name: {profile_image.name}")
            logger.info(f"🖼️ File size: {profile_image.size} bytes")
            logger.info(f"🖼️ File content type: {profile_image.content_type}")

            try:
                user.profile.profile_image = profile_image
                user.profile.save()
                logger.info(f"✅ Profile image saved successfully!")
            except Exception as e:
                logger.error(f"❌ Error saving profile image: {str(e)}")
                return Response(
                    {"error": f"Failed to upload profile image: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            logger.info(f"ℹ️ No profile_image in FILES")

        # Build profile image URL if it exists
        profile_image_url = None
        if user.profile.profile_image:
            profile_image_url = request.build_absolute_uri(user.profile.profile_image.url)
            logger.info(f"🖼️ Profile image URL: {profile_image_url}")

        return Response({
            "message": "Profile updated successfully",
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone_number": getattr(user.profile, "phone_number", ""),
            "profile_image_url": profile_image_url
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):

    user = request.user
    old_password = request.data.get("old_password")
    new_password = request.data.get("new_password")

    if not user.check_password(old_password):
        return Response(
            {"error": "Old password is incorrect"},
            status=status.HTTP_400_BAD_REQUEST
        )

    user.set_password(new_password)
    user.save()

    return Response({"message": "Password updated successfully"})


@api_view(['GET'])
@permission_classes([AllowAny])
def public_user(request, user_id):
    user = get_object_or_404(User, id=user_id)
    profile_image_url = None
    if hasattr(user, 'profile') and user.profile.profile_image:
        profile_image_url = request.build_absolute_uri(user.profile.profile_image.url)

    # badges
    badges = []
    try:
        badges = [
            {"id": ub.badge.id, "name": ub.badge.name, "icon": ub.badge.icon, "awarded_at": ub.awarded_at}
            for ub in user.badges.select_related('badge').all()
        ]
    except Exception:
        badges = []

    return Response({
        "id": user.id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "profile_image_url": profile_image_url,
        "date_joined": user.date_joined,
        "badges": badges,
    })

from geopy.geocoders import Nominatim

@api_view(['GET'])
def reverse_geocode(request):
    lat = request.GET.get("lat")
    lon = request.GET.get("lon")

    geolocator = Nominatim(user_agent="pet_finder")

    location = geolocator.reverse(f"{lat}, {lon}")

    return Response({
        "address": location.address if location else ""
    })
