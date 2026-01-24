from rest_framework import generics
from .models import Announcement
from .serializers import AnnouncementSerializer

# This view handles GET (list all) and POST (create new)
class AnnouncementList(generics.ListCreateAPIView):
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer

# This view handles GET, PUT, and DELETE for a single item by ID
class AnnouncementDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer