from rest_framework import serializers
from .models import (
    Announcement,
    Location,
    Notification,
    Pet,
    SavedAnnouncement,
    Comment,
)
from .models import Reaction
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
    views_count = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    reactions = serializers.SerializerMethodField()

    # 🔥 Додаємо телефон з профілю (defensive)
    phone_number = serializers.SerializerMethodField()

    def get_phone_number(self, obj):
        owner = getattr(obj, 'owner', None)
        if not owner:
            return ""
        profile = getattr(owner, 'profile', None)
        if not profile:
            return ""
        return getattr(profile, 'phone_number', "")

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
            'email',
            'created_at',
            'updated_at',
            'is_active',
            'is_reunited',
            'views_count',
            'is_saved',
            'comments_count',
            'reactions',
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
            else:
                # Create location with default coordinates if no address or lat/lng
                location = Location.objects.create(
                    address="",
                    latitude=0.0,
                    longitude=0.0,
                )

        # Owner may be passed via serializer.save(owner=...) from the view
        owner = validated_data.pop('owner', None)

        pet_data = validated_data.pop('pet')

        pet = Pet.objects.create(**pet_data)

        if owner is None and request is not None:
            owner = request.user

        announcement = Announcement.objects.create(
            owner=owner,
            pet=pet,
            location=location,
            **validated_data
        )


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

    def get_views_count(self, obj):
        annotated = getattr(obj, "views_count_annotated", None)
        if annotated is not None:
            return annotated
        return obj.post_views.count()

    def get_is_saved(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return SavedAnnouncement.objects.filter(
            user=request.user,
            announcement=obj,
        ).exists()

    def get_comments_count(self, obj):
        annotated = getattr(obj, "comments_count_annotated", None)
        if annotated is not None:
            return annotated
        return obj.comments.count()

    def get_reactions(self, obj):
        # returns counts per kind and whether current user reacted
        request = self.context.get('request')
        qs = getattr(obj, 'reactions', None)
        if qs is None:
            qs = Reaction.objects.filter(announcement=obj)

        # include icon and label for each known kind
        kinds = []
        for kind, label in Reaction.KIND_CHOICES:
            count = qs.filter(kind=kind).count()
            kinds.append({
                'kind': kind,
                'label': label,
                'icon': Reaction.ICONS.get(kind, ''),
                'count': count,
            })

        user_reaction = None
        if request and request.user.is_authenticated:
            r = qs.filter(user=request.user).first()
            if r:
                user_reaction = r.kind

        return {'kinds': kinds, 'user_reaction': user_reaction}


class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_badges = serializers.SerializerMethodField()
    reactions = serializers.SerializerMethodField()
    parent = serializers.PrimaryKeyRelatedField(queryset=Comment.objects.all(), required=False, allow_null=True)

    class Meta:
        model = Comment
        fields = [
            "id",
            "user",
            "user_badges",
            "reactions",
            "announcement",
            "text",
            "parent",
            "created_at",
        ]
        read_only_fields = ["user", "announcement", "created_at"]

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        request = self.context.get("request")
        # include profile image URL if available
        profile_image = None
        if hasattr(instance.user, 'profile') and instance.user.profile.profile_image:
            if request:
                profile_image = request.build_absolute_uri(instance.user.profile.profile_image.url)
            else:
                profile_image = instance.user.profile.profile_image.url
        rep["user_profile_image"] = profile_image
        return rep

    def get_user_badges(self, obj):
        try:
            badges = obj.user.badges.select_related('badge').all()
            return [{"id": ub.badge.id, "name": ub.badge.name, "icon": ub.badge.icon} for ub in badges]
        except Exception:
            return []

    def get_reactions(self, obj):
        # only show reactions present for this comment
        qs = Reaction.objects.filter(comment=obj)
        counts = {}
        for kind, label in Reaction.KIND_CHOICES:
            c = qs.filter(kind=kind).count()
            if c:
                counts[kind] = { 'label': label, 'icon': Reaction.ICONS.get(kind, ''), 'count': c }

        # current user reaction on this comment
        request = self.context.get('request')
        user_reaction = None
        if request and request.user.is_authenticated:
            r = qs.filter(user=request.user).first()
            if r:
                user_reaction = r.kind

        return { 'counts': counts, 'user_reaction': user_reaction }


class SavedAnnouncementSerializer(serializers.ModelSerializer):
    announcement = AnnouncementSerializer(read_only=True)

    class Meta:
        model = SavedAnnouncement
        fields = ["id", "announcement", "created_at"]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "type",
            "title",
            "related_announcement",
            "related_message",
            "is_read",
            "created_at",
        ]
