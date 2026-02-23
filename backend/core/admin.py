from django.contrib import admin
from .models import (
    Pet,
    Location,
    Announcement,
    Message,
    Photo,
    Profile,
    Conversation,
    ConversationParticipant,
    ChatMessage,
    Notification,
    PostView,
    SavedAnnouncement,
    UserPresence,
)

admin.site.register(Pet)
admin.site.register(Location)
admin.site.register(Announcement)
admin.site.register(Message)
admin.site.register(Photo)
admin.site.register(Profile)
admin.site.register(Conversation)
admin.site.register(ConversationParticipant)
admin.site.register(ChatMessage)
admin.site.register(PostView)
admin.site.register(SavedAnnouncement)
admin.site.register(UserPresence)
admin.site.register(Notification)
