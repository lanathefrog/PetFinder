from django.contrib.auth.models import User
from rest_framework import generics
from .models import Announcement
from .serializers import AnnouncementSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import re  # Import regex


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


# ... (Keep your register_user and my_announcements views as they are) ...
@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    data = request.data
    try:
        user = User.objects.create_user(
            username=data['username'],
            password=data['password'],
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', '')
        )
        return Response({'message': 'User created successfully'}, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_announcements(request):
    user_announcements = Announcement.objects.filter(owner=request.user)
    serializer = AnnouncementSerializer(user_announcements, many=True)
    return Response(serializer.data)