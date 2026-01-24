from rest_framework import serializers
from .models import Pet, Announcement, Location
from django.contrib.auth.models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']


class PetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pet
        fields = '__all__'


class LocationSerializer(serializers.ModelSerializer):
    # Make lat/long not required since we default them
    latitude = serializers.FloatField(required=False)
    longitude = serializers.FloatField(required=False)

    class Meta:
        model = Location
        fields = '__all__'


class AnnouncementSerializer(serializers.ModelSerializer):
    pet = PetSerializer()
    location = LocationSerializer()  # Handle nested location data
    owner = serializers.PrimaryKeyRelatedField(read_only=True)  # Backend sets this, not frontend

    class Meta:
        model = Announcement
        fields = [
            'id', 'pet', 'owner', 'status', 'location',
            'contact_phone', 'description'
        ]

    def create(self, validated_data):
        # 1. Extract nested data
        pet_data = validated_data.pop('pet')
        location_data = validated_data.pop('location')

        # 2. Create Pet
        pet = Pet.objects.create(**pet_data)

        # 3. Create Location (Default lat/long to 0.0 if missing)
        if 'latitude' not in location_data: location_data['latitude'] = 0.0
        if 'longitude' not in location_data: location_data['longitude'] = 0.0
        location = Location.objects.create(**location_data)

        # 4. Create Announcement
        announcement = Announcement.objects.create(
            pet=pet,
            location=location,
            **validated_data
        )
        return announcement