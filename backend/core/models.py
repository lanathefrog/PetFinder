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



@receiver(post_save, sender=User)
def create_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance, phone_number="0000000000")