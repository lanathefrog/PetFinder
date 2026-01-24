from django.urls import path

from . import views
from .views import AnnouncementList, AnnouncementDetail, register_user

urlpatterns = [
    path('announcements/', AnnouncementList.as_view(), name='announcement-list'),
    path('announcements/<int:pk>/', AnnouncementDetail.as_view(), name='announcement-detail'),
    path('register/', register_user, name='register'),
    path('announcements/me/', views.my_announcements, name='my-announcements'),
]
