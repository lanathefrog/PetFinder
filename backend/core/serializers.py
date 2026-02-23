from rest_framework import serializers
from .models import Pet, Announcement, Location
from django.contrib.auth.models import User
from .utils import get_coordinates

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']

class PetSerializer(serializers.ModelSerializer):
    photo = serializers.SerializerMethodField()

    class Meta:
        model = Pet
        fields = '__all__'

    def get_photo(self, obj):
        if not obj.photo:
            return None

        request = self.context.get("request")

        if request:
            return request.build_absolute_uri(obj.photo.url)

        return obj.photo.url

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

    # 🔥 Додаємо email з User
    email = serializers.CharField(
        source='owner.email',
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
            'phone_number',
            'email'
        ]

    def create(self, validated_data):
        request = self.context.get('request')
        location_data = validated_data.pop('location', None)

        location = None

        if location_data:
            address = location_data.get("address")
            lat = location_data.get("latitude")
            lng = location_data.get("longitude")

            if lat and lng:
                location = Location.objects.create(
                    address=address or "",
                    latitude=float(lat),
                    longitude=float(lng),
                )

            elif address:
                lat, lng = get_coordinates(address)

                location = Location.objects.create(
                    address=address,
                    latitude=lat or 0,
                    longitude=lng or 0,
                )

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

        print("LOCATION DATA:", location_data)

        return announcement

    def update(self, instance, validated_data):

        pet_data = validated_data.pop('pet', None)
        location_data = validated_data.pop('location', None)

        # 🔹 update pet
        if pet_data:
            for attr, value in pet_data.items():
                setattr(instance.pet, attr, value)
            instance.pet.save()

        # 🔹 update location with proper latitude and longitude
        if location_data:
            lat = location_data.get("latitude")
            lng = location_data.get("longitude")
            address = location_data.get("address", instance.location.address)

            # If we have coordinates, use them directly
            if lat is not None and lng is not None:
                instance.location.latitude = float(lat)
                instance.location.longitude = float(lng)
                instance.location.address = address
            else:
                # Otherwise try to get coordinates from address
                lat, lng = get_coordinates(address)
                instance.location.address = address
                instance.location.latitude = lat or instance.location.latitude
                instance.location.longitude = lng or instance.location.longitude

            instance.location.save()

        # 🔹 update announcement fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance