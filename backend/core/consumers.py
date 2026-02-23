import json
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.utils import timezone

from .models import ChatMessage, ConversationParticipant, Notification, UserPresence


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        self.conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]
        self.room_group_name = f"chat_{self.conversation_id}"

        is_participant = await self._is_participant(user.id, self.conversation_id)
        if not is_participant:
            await self.close(code=4003)
            return

        await self._set_user_online(user.id)
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        user = self.scope.get("user")
        if user and user.is_authenticated:
            await self._set_user_offline(user.id)
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return

        try:
            payload = json.loads(text_data)
        except json.JSONDecodeError:
            return

        if payload.get("type") != "message":
            return

        text = (payload.get("text") or "").strip()
        if not text:
            return

        message_data = await self._create_message(
            conversation_id=self.conversation_id,
            sender_id=self.scope["user"].id,
            text=text,
        )
        if not message_data:
            return
        await self._create_message_notifications(
            conversation_id=self.conversation_id,
            sender_id=self.scope["user"].id,
            message_id=message_data["id"],
        )

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat.message",
                "message": message_data,
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))

    @database_sync_to_async
    def _is_participant(self, user_id, conversation_id):
        return ConversationParticipant.objects.filter(
            conversation_id=conversation_id,
            user_id=user_id
        ).exists()

    @database_sync_to_async
    def _create_message(self, conversation_id, sender_id, text):
        if not ConversationParticipant.objects.filter(
            conversation_id=conversation_id,
            user_id=sender_id
        ).exists():
            return None

        message = ChatMessage.objects.create(
            conversation_id=conversation_id,
            sender_id=sender_id,
            text=text,
        )

        # Sender has read up to now
        ConversationParticipant.objects.filter(
            conversation_id=conversation_id,
            user_id=sender_id
        ).update(last_read_at=timezone.now())

        return {
            "id": message.id,
            "conversation_id": message.conversation_id,
            "text": message.text,
            "sender_id": message.sender_id,
            "created_at": message.created_at.isoformat(),
            "type": "message",
        }

    @database_sync_to_async
    def _set_user_online(self, user_id):
        UserPresence.objects.update_or_create(
            user_id=user_id,
            defaults={"is_online": True},
        )

    @database_sync_to_async
    def _set_user_offline(self, user_id):
        UserPresence.objects.update_or_create(
            user_id=user_id,
            defaults={"is_online": False, "last_seen": timezone.now()},
        )

    @database_sync_to_async
    def _create_message_notifications(self, conversation_id, sender_id, message_id):
        sender_participant = ConversationParticipant.objects.filter(
            conversation_id=conversation_id,
            user_id=sender_id,
        ).select_related("user").first()
        sender_username = sender_participant.user.username if sender_participant else "Someone"

        recipients = ConversationParticipant.objects.filter(
            conversation_id=conversation_id
        ).exclude(
            user_id=sender_id
        ).values_list("user_id", flat=True)

        message = ChatMessage.objects.select_related("conversation__announcement").filter(
            id=message_id
        ).first()
        if not message:
            return

        for user_id in recipients:
            Notification.objects.create(
                user_id=user_id,
                type=Notification.TYPE_NEW_MESSAGE,
                title=f"New message from {sender_username}",
                related_announcement=message.conversation.announcement,
                related_message=message,
            )
