from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0010_profile_profile_image"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Conversation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("is_closed", models.BooleanField(default=False)),
                (
                    "announcement",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="conversations", to="core.announcement"),
                ),
                (
                    "initiator",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="started_conversations", to=settings.AUTH_USER_MODEL),
                ),
                (
                    "related_reunion",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="reunion_conversations", to="core.announcement"),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="ChatMessage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("text", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("is_read", models.BooleanField(default=False)),
                ("attachment", models.FileField(blank=True, null=True, upload_to="chat_attachments/")),
                ("image", models.ImageField(blank=True, null=True, upload_to="chat_images/")),
                ("location", models.CharField(blank=True, max_length=255, null=True)),
                ("system_message", models.BooleanField(default=False)),
                (
                    "conversation",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="messages", to="core.conversation"),
                ),
                (
                    "sender",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="chat_messages", to=settings.AUTH_USER_MODEL),
                ),
            ],
            options={
                "ordering": ["created_at"],
            },
        ),
        migrations.CreateModel(
            name="ConversationParticipant",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("joined_at", models.DateTimeField(auto_now_add=True)),
                ("last_read_at", models.DateTimeField(blank=True, null=True)),
                (
                    "conversation",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="participants", to="core.conversation"),
                ),
                (
                    "user",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="chat_participations", to=settings.AUTH_USER_MODEL),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="conversation",
            constraint=models.UniqueConstraint(fields=("announcement", "initiator"), name="unique_conversation_per_announcement_initiator"),
        ),
        migrations.AddConstraint(
            model_name="conversationparticipant",
            constraint=models.UniqueConstraint(fields=("conversation", "user"), name="unique_user_per_conversation"),
        ),
    ]

