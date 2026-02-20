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
    location = LocationSerializer()
    owner = serializers.PrimaryKeyRelatedField(read_only=True)

    # 🔥 Додаємо телефон з профілю
    phone_number = serializers.CharField(
        source='owner.profile.phone_number',
        read_only=True
    )

    class Meta:
        model = Announcement
        fields = [
            'id',
            'pet',
            'owner',
            'status',
            'location',
            'description',
            'phone_number'
        ]

    def create(self, validated_data):
        request = self.context.get('request')

        # Owner may be passed via serializer.save(owner=...) from the view
        owner = validated_data.pop('owner', None)

        pet_data = validated_data.pop('pet')
        location_data = validated_data.pop('location')

        pet = Pet.objects.create(**pet_data)

        if 'latitude' not in location_data:
            location_data['latitude'] = 0.0
        if 'longitude' not in location_data:
            location_data['longitude'] = 0.0

        location = Location.objects.create(**location_data)

        if owner is None and request is not None:
            owner = request.user

        announcement = Announcement.objects.create(
            owner=owner,
            pet=pet,
            location=location,
            **validated_data
        )

        return announcement