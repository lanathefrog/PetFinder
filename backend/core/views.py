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
    user_announcements = Announcement.objects.filter(owner=request.user)
    serializer = AnnouncementSerializer(user_announcements, many=True)
    return Response(serializer.data)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def current_user(request):

    user = request.user

    if request.method == 'GET':
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "phone_number": getattr(user.profile, "phone_number", "")
        })

    if request.method == 'PUT':
        user.username = request.data.get('username', user.username)
        user.email = request.data.get('email', user.email)
        user.save()

        return Response({
            "message": "Profile updated successfully"
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
