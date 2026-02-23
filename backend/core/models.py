from django.db import models
from django.contrib.auth.models import User
from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    phone_number = models.CharField(max_length=20, blank=False)
    profile_image = models.ImageField(upload_to='profiles/', blank=True, null=True)

    def __str__(self):
        return self.user.username

# ==========================
# Модель тварини
# ==========================
class Pet(models.Model):
    PET_TYPES = [
        ('dog', 'Dog'),
        ('cat', 'Cat'),
        ('bird', 'Bird'),
        ('other', 'Other'),
    ]
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('unknown', 'Unknown'),
    ]

    name = models.CharField(max_length=50)
    pet_type = models.CharField(max_length=10, choices=PET_TYPES)
    breed = models.CharField(max_length=50, blank=True)
    color = models.CharField(max_length=30, blank=True)
    description = models.TextField(blank=True)
    photo = models.ImageField(upload_to='pets/', blank=True, null=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True)

    def __str__(self):
        return f"{self.name} ({self.pet_type})"


# ==========================
# Місце (координати)
# ==========================
class Location(models.Model):
    latitude = models.FloatField()
    longitude = models.FloatField()
    address = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return self.address or f"{self.latitude}, {self.longitude}"


# ==========================
# Оголошення
# ==========================
class Announcement(models.Model):
    STATUS_CHOICES = [
        ('lost', 'Lost'),
        ('found', 'Found'),
    ]

    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='announcements')
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='announcements')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    location = models.OneToOneField(Location, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    is_reunited = models.BooleanField(default=False)
    def __str__(self):
        return f"{self.pet.name} - {self.status}"


# ==========================
# Повідомлення для чату
# ==========================
class Message(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    announcement = models.ForeignKey(Announcement, on_delete=models.CASCADE, related_name='messages')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False)

    def __str__(self):
        return f"From {self.sender.username} to {self.recipient.username}"


# ==========================
# Додаткові фото для оголошень (необов’язково)
# ==========================
class Photo(models.Model):
    announcement = models.ForeignKey(Announcement, on_delete=models.CASCADE, related_name='photos')
    file = models.ImageField(upload_to='announcement_photos/')

    def __str__(self):
        return f"Photo for {self.announcement.pet.name}"


class Conversation(models.Model):
    announcement = models.ForeignKey(
        Announcement,
        on_delete=models.CASCADE,
        related_name="conversations"
    )
    initiator = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="started_conversations"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    # Future-ready
    is_closed = models.BooleanField(default=False)
    related_reunion = models.ForeignKey(
        Announcement,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reunion_conversations"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["announcement", "initiator"],
                name="unique_conversation_per_announcement_initiator"
            )
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"Conversation #{self.id} ({self.announcement_id})"


class ConversationParticipant(models.Model):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="participants"
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="chat_participations"
    )
    joined_at = models.DateTimeField(auto_now_add=True)
    last_read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["conversation", "user"],
                name="unique_user_per_conversation"
            )
        ]

    def __str__(self):
        return f"{self.user.username} in {self.conversation_id}"


class ChatMessage(models.Model):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages"
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="chat_messages"
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    # Future-ready
    attachment = models.FileField(upload_to="chat_attachments/", null=True, blank=True)
    image = models.ImageField(upload_to="chat_images/", null=True, blank=True)
    location = models.CharField(max_length=255, null=True, blank=True)
    system_message = models.BooleanField(default=False)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Msg #{self.id} in conversation {self.conversation_id}"


class PostView(models.Model):
    announcement = models.ForeignKey(
        Announcement,
        on_delete=models.CASCADE,
        related_name="post_views",
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="announcement_views",
        null=True,
        blank=True,
    )
    session_key = models.CharField(max_length=64, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["announcement", "user"],
                name="unique_post_view_per_user",
            ),
            models.UniqueConstraint(
                fields=["announcement", "session_key"],
                name="unique_post_view_per_session",
            ),
        ]


class SavedAnnouncement(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="saved_announcements",
    )
    announcement = models.ForeignKey(
        Announcement,
        on_delete=models.CASCADE,
        related_name="saved_by_users",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "announcement"],
                name="unique_saved_announcement",
            )
        ]


class UserPresence(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="presence",
    )
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username}: {'online' if self.is_online else 'offline'}"


class Notification(models.Model):
    TYPE_NEW_MESSAGE = "new_message"
    TYPE_POST_SAVED = "post_saved"
    TYPE_POST_LIKED = "post_liked"
    TYPE_CONTACTED = "contacted"
    TYPE_CHOICES = [
        (TYPE_NEW_MESSAGE, "New message"),
        (TYPE_POST_SAVED, "Post saved"),
        (TYPE_POST_LIKED, "Post liked"),
        (TYPE_CONTACTED, "Contacted"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    title = models.CharField(max_length=255)
    related_announcement = models.ForeignKey(
        Announcement,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )
    related_message = models.ForeignKey(
        ChatMessage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} - {self.type}"


@receiver(post_save, sender=User)
def create_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance, phone_number="0000000000")
