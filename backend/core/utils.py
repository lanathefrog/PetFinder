from geopy.geocoders import Nominatim

geolocator = Nominatim(user_agent="pet_finder")

def get_coordinates(address):
    try:
        location = geolocator.geocode(address)
        if location:
            return location.latitude, location.longitude
    except:
        pass

    return None, None


def check_and_assign_badges(user):
    """
    Evaluate badge criteria for the given user and assign any missing badges.
    This is idempotent and currently only awards badges (does not remove).
    """
    from .models import (
        Badge,
        UserBadge,
        Announcement,
        Comment,
        SavedAnnouncement,
    )

    # Ensure badge definitions exist
    badges = {
        'Rescuer': {
            'description': 'Made at least 1 reunion',
            'icon': 'rescuer',
        },
        'Hero Rescuer': {
            'description': 'Made at least 5 reunions',
            'icon': 'hero',
        },
        'Active Helper': {
            'description': 'Posted at least 10 comments',
            'icon': 'helper',
        },
        'Community Supporter': {
            'description': 'Saved at least 10 posts',
            'icon': 'supporter',
        },
        'Early Member': {
            'description': 'Joined early',
            'icon': 'early',
        },
    }

    for name, meta in badges.items():
        Badge.objects.get_or_create(name=name, defaults={'description': meta['description'], 'icon': meta['icon']})

    # metrics
    reunions = Announcement.objects.filter(owner=user, is_reunited=True).count()
    comments_count = Comment.objects.filter(user=user).count()
    saves_count = SavedAnnouncement.objects.filter(user=user).count()
    total_users = user.__class__.objects.count()

    # award Rescuer
    rescuer_badge = Badge.objects.get(name='Rescuer')
    if reunions >= 1:
        UserBadge.objects.get_or_create(user=user, badge=rescuer_badge)

    hero_badge = Badge.objects.get(name='Hero Rescuer')
    if reunions >= 5:
        UserBadge.objects.get_or_create(user=user, badge=hero_badge)

    helper_badge = Badge.objects.get(name='Active Helper')
    if comments_count >= 10:
        UserBadge.objects.get_or_create(user=user, badge=helper_badge)

    supporter_badge = Badge.objects.get(name='Community Supporter')
    if saves_count >= 10:
        UserBadge.objects.get_or_create(user=user, badge=supporter_badge)

    early_badge = Badge.objects.get(name='Early Member')
    # define early as first 100 users
    if user.id and user.id <= max(100, min(100, total_users)):
        UserBadge.objects.get_or_create(user=user, badge=early_badge)

    # Note: other badges (Top Contributor, Trusted Owner) require reactions or profile checks
    return True