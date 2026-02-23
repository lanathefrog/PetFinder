from urllib import request

from django.contrib.auth.models import User
from rest_framework import generics
from .models import Announcement
from .serializers import AnnouncementSerializer
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
        queryset = Announcement.objects.all()

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
    permission_classes = [IsAuthenticated]  # Ensure only logged-in users can post

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
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAuthenticated]

    def perform_update(self, serializer):
        if self.request.user != self.get_object().owner:
            raise PermissionDenied("You cannot edit this announcement.")
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user != instance.owner:
            raise PermissionDenied("You cannot delete this announcement.")
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

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def current_user(request):

    user = request.user

    if request.method == 'GET':
        # Build profile image URL if it exists
        profile_image_url = None
        if hasattr(user, 'profile') and user.profile.profile_image:
            profile_image_url = request.build_absolute_uri(user.profile.profile_image.url)

        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone_number": getattr(user.profile, "phone_number", ""),
            "profile_image_url": profile_image_url
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
