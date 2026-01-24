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
    pet = PetSerializer()
    # Use PrimaryKeyRelatedField so you can send just the ID (e.g., 1)
    owner = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = Announcement
        fields = [
            'id', 'pet', 'owner', 'status', 'location',
            'contact_phone', 'description'
        ]

    def create(self, validated_data):
        pet_data = validated_data.pop('pet')
        # Create the pet first
        pet = Pet.objects.create(**pet_data)
        # Create the announcement with the existing pet and owner
        announcement = Announcement.objects.create(pet=pet, **validated_data)
        return announcement