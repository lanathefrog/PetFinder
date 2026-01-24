from django.contrib.auth.models import User
from rest_framework import generics
from .models import Announcement
from .serializers import AnnouncementSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

class AnnouncementList(generics.ListCreateAPIView):
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
class AnnouncementDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    print("Received registration data:", request.data)

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
        print("Registration Exception:", str(e))
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_announcements(request):
    user_announcements = Announcement.objects.filter(owner=request.user)
    serializer = AnnouncementSerializer(user_announcements, many=True)
    return Response(serializer.data)