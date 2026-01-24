from rest_framework import serializers
from .models import Pet, Announcement, Location
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        # Include the new name fields
        fields = ['id', 'username', 'first_name', 'last_name', 'email']

class PetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pet
        # 'gender' will now be included automatically
        fields = '__all__'

class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = '__all__'

class AnnouncementSerializer(serializers.ModelSerializer):
    pet = PetSerializer(read_only=True)
    location = LocationSerializer(read_only=True)
    owner = UserSerializer(read_only=True)

    class Meta:
        model = Announcement
        # Explicitly including 'contact_phone' and 'is_active'
        fields = [
            'id', 'pet', 'owner', 'status', 'location',
            'contact_phone', 'is_active', 'created_at',
            'updated_at', 'description'
        ]