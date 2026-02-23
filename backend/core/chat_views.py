from django.db.models import Max
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .chat_serializers import (
    ChatMessageSerializer,
    ConversationListSerializer,
    StartConversationSerializer,
)
from .models import Announcement, ChatMessage, Conversation, ConversationParticipant, Notification


def _ensure_participant(conversation, user):
    return ConversationParticipant.objects.filter(
        conversation=conversation,
        user=user
    ).exists()


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_conversation(request):
    serializer = StartConversationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    announcement_id = serializer.validated_data["announcement_id"]

    announcement = get_object_or_404(
        Announcement.objects.select_related("owner"),
        id=announcement_id
    )

    if announcement.owner_id == request.user.id:
        return Response(
            {"detail": "You cannot start a chat with yourself."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    conversation, created = Conversation.objects.get_or_create(
        announcement=announcement,
        initiator=request.user,
    )

    ConversationParticipant.objects.bulk_create(
        [
            ConversationParticipant(conversation=conversation, user=request.user),
            ConversationParticipant(conversation=conversation, user=announcement.owner),
        ],
        ignore_conflicts=True,
    )

    if created:
        Notification.objects.create(
            user=announcement.owner,
            type=Notification.TYPE_CONTACTED,
            title=f"{request.user.username} contacted you about {announcement.pet.name}",
            related_announcement=announcement,
        )

    response_data = ConversationListSerializer(
        conversation,
        context={"request": request}
    ).data
    response_data["created"] = created

    return Response(response_data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def conversations_list(request):
    page = max(int(request.query_params.get("page", 1)), 1)
    page_size = min(max(int(request.query_params.get("page_size", 20)), 1), 50)

    queryset = Conversation.objects.filter(
        participants__user=request.user
    ).select_related(
        "announcement__pet"
    ).prefetch_related(
        "participants__user",
        "participants__user__presence",
        "messages",
        "messages__sender",
    ).annotate(
        updated_at=Max("messages__created_at")
    ).order_by("-updated_at", "-created_at")

    start = (page - 1) * page_size
    end = start + page_size

    data = ConversationListSerializer(
        queryset[start:end],
        many=True,
        context={"request": request}
    ).data

    return Response(
        {
            "count": queryset.count(),
            "page": page,
            "page_size": page_size,
            "results": data,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def conversation_messages(request, conversation_id):
    conversation = get_object_or_404(Conversation, id=conversation_id)
    if not _ensure_participant(conversation, request.user):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    before_id = request.query_params.get("before_id")
    limit = min(max(int(request.query_params.get("limit", 50)), 1), 100)

    queryset = ChatMessage.objects.filter(conversation=conversation).select_related("sender")
    if before_id:
        queryset = queryset.filter(id__lt=before_id)

    # Load newest chunk and return ascending in UI
    messages = list(queryset.order_by("-id")[:limit])
    messages.reverse()

    participant = ConversationParticipant.objects.filter(
        conversation=conversation,
        user=request.user
    ).first()
    if participant:
        participant.last_read_at = timezone.now()
        participant.save(update_fields=["last_read_at"])

    serialized = ChatMessageSerializer(
        messages,
        many=True,
        context={"request": request}
    ).data

    next_before_id = messages[0].id if len(messages) == limit else None
    return Response(
        {
            "results": serialized,
            "next_before_id": next_before_id,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_message_http(request):
    conversation_id = request.data.get("conversation_id")
    text = (request.data.get("text") or "").strip()

    if not conversation_id:
        return Response(
            {"detail": "conversation_id is required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    if not text:
        return Response(
            {"detail": "text is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    conversation = get_object_or_404(Conversation, id=conversation_id)
    if not _ensure_participant(conversation, request.user):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    message = ChatMessage.objects.create(
        conversation=conversation,
        sender=request.user,
        text=text,
    )

    recipient_users = ConversationParticipant.objects.filter(
        conversation=conversation
    ).exclude(
        user=request.user
    ).select_related("user")
    for participant in recipient_users:
        Notification.objects.create(
            user=participant.user,
            type=Notification.TYPE_NEW_MESSAGE,
            title=f"New message from {request.user.username}",
            related_announcement=conversation.announcement,
            related_message=message,
        )

    serializer = ChatMessageSerializer(message, context={"request": request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_conversation_read(request, conversation_id):
    conversation = get_object_or_404(Conversation, id=conversation_id)
    participant = ConversationParticipant.objects.filter(
        conversation=conversation,
        user=request.user
    ).first()

    if not participant:
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    participant.last_read_at = timezone.now()
    participant.save(update_fields=["last_read_at"])

    return Response({"status": "ok"})
