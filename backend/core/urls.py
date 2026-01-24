from django.urls import path
from .views import AnnouncementList, AnnouncementDetail

urlpatterns = [
    path('announcements/', AnnouncementList.as_view(), name='announcement-list'),
    path('announcements/<int:pk>/', AnnouncementDetail.as_view(), name='announcement-detail'),
]