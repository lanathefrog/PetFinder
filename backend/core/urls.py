from django.urls import path


from . import views
from .views import AnnouncementList, AnnouncementDetail, register_user, reverse_geocode
from . import chat_views

urlpatterns = [
    path('announcements/', AnnouncementList.as_view(), name='announcement-list'),
    path('announcements/<int:pk>/', AnnouncementDetail.as_view(), name='announcement-detail'),
        path('users/<int:user_id>/', views.public_user, name='public-user'),
        path('announcements/<int:announcement_id>/comments/', views.AnnouncementCommentList.as_view(), name='announcement-comments'),
        path('comments/<int:pk>/', views.CommentDetail.as_view(), name='comment-detail'),
        path('announcements/<int:announcement_id>/reactions/', views.toggle_reaction, name='announcement-reactions'),
    path('register/', register_user, name='register'),
    path('announcements/me/', views.my_announcements, name='my-announcements'),
path('users/me/', views.current_user, name='current-user'),
path('users/change-password/', views.change_password, name='change-password'),
path("reverse-geocode/", reverse_geocode),
path("chat/conversations/", chat_views.conversations_list, name="chat-conversations"),
path("chat/conversations/<int:conversation_id>/messages/", chat_views.conversation_messages, name="chat-conversation-messages"),
path("chat/conversations/<int:conversation_id>/read/", chat_views.mark_conversation_read, name="chat-conversation-read"),
path("chat/start/", chat_views.start_conversation, name="chat-start"),
path("chat/messages/", chat_views.send_message_http, name="chat-send-message"),
path("announcements/<int:announcement_id>/save/", views.toggle_save_announcement, name="announcement-save"),
path("users/me/saved/", views.my_saved_announcements, name="my-saved-announcements"),
path("notifications/", views.notifications_list, name="notifications-list"),
path("notifications/read/", views.notifications_read, name="notifications-read"),

]
