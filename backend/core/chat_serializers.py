from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Announcement, ChatMessage, Conversation, ConversationParticipant
from .serializers import PetSerializer


class ChatUserSerializer(serializers.ModelSerializer):
    profile_image_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "profile_image_url"]

    def get_profile_image_url(self, obj):
        profile = getattr(obj, "profile", None)
        if not profile or not profile.profile_image:
            return None

        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(profile.profile_image.url)
        return profile.profile_image.url


class ChatMessageSerializer(serializers.ModelSerializer):
    sender = ChatUserSerializer(read_only=True)
    sender_id = serializers.IntegerField(source="sender.id", read_only=True)

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "conversation",
            "sender",
            "sender_id",
            "text",
            "created_at",
            "is_read",
            "attachment",
            "image",
            "location",
            "system_message",
        ]
        read_only_fields = [
            "id",
            "conversation",
            "sender",
            "sender_id",
            "created_at",
            "is_read",
        ]


class ConversationListSerializer(serializers.ModelSerializer):
    announcement_title = serializers.CharField(source="announcement.pet.name", read_only=True)
    announcement_id = serializers.IntegerField(source="announcement.id", read_only=True)
    announcement_status = serializers.CharField(source="announcement.status", read_only=True)
    announcement_pet = PetSerializer(source="announcement.pet", read_only=True)
    other_user = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    updated_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Conversation
        fields = [
            "id",
            "announcement_id",
            "announcement_title",
            "announcement_status",
            "announcement_pet",
            "created_at",
            "updated_at",
            "other_user",
            "last_message",
            "unread_count",
        ]

    def _get_participant(self, obj):
        request = self.context["request"]
        return obj.participants.filter(user=request.user).first()

    def get_other_user(self, obj):
        request = self.context["request"]
        other = obj.participants.exclude(user=request.user).select_related("user").first()
        if not other:
            return None
        return ChatUserSerializer(other.user, context=self.context).data

    def get_last_message(self, obj):
        message = obj.messages.select_related("sender").order_by("-created_at").first()
        if not message:
            return None
        return {
            "id": message.id,
            "text": message.text,
            "created_at": message.created_at,
            "sender_id": message.sender_id,
        }

    def get_unread_count(self, obj):
        participant = self._get_participant(obj)
        if not participant:
            return 0

        queryset = obj.messages.exclude(sender=participant.user)
        if participant.last_read_at:
            queryset = queryset.filter(created_at__gt=participant.last_read_at)
        return queryset.count()


class StartConversationSerializer(serializers.Serializer):
    announcement_id = serializers.IntegerField()

    def validate_announcement_id(self, value):
        if not Announcement.objects.filter(id=value).exists():
            raise serializers.ValidationError("Announcement not found.")
        return value
