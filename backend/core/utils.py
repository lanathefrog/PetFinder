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


from math import radians, cos, sin, asin, sqrt
from difflib import SequenceMatcher
from datetime import datetime


def haversine_meters(lat1, lon1, lat2, lon2):
    # return distance in meters between two lat/lon pairs
    try:
        # convert decimal degrees to radians
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        km = 6371 * c
        return km * 1000
    except Exception:
        return None


def text_similarity(a, b):
    try:
        if not a or not b:
            return 0.0
        return SequenceMatcher(None, a.lower(), b.lower()).ratio()
    except Exception:
        return 0.0


def find_matches_for_announcement(announcement, threshold=0.25, limit=10):
    """
    Return a list of candidate announcements (opposite status) with computed score.
    Lower threshold is more permissive. Result is list of tuples (candidate, score).
    """
    from .models import Announcement

    if not announcement.location:
        return []

    candidates = Announcement.objects.filter(status='lost' if announcement.status == 'found' else 'found').exclude(id=announcement.id).select_related('pet', 'location', 'owner')

    results = []
    for c in candidates:
        score = 0.0

        # distance (meters)
        if c.location and announcement.location:
            d = haversine_meters(announcement.location.latitude, announcement.location.longitude, c.location.latitude, c.location.longitude)
            if d is None:
                dist_score = 0.0
            else:
                # closer is better; use a soft scoring where 0m -> 1, 10km -> ~0
                dist_score = max(0.0, 1 - (d / 10000.0))
        else:
            dist_score = 0.0
        score += 0.35 * dist_score

        # pet type exact match
        try:
            if announcement.pet.pet_type and c.pet.pet_type and announcement.pet.pet_type == c.pet.pet_type:
                score += 0.2
        except Exception:
            pass

        # breed similarity
        try:
            breed_sim = text_similarity(announcement.pet.breed or '', c.pet.breed or '')
            score += 0.15 * breed_sim
        except Exception:
            pass

        # color simple substring match
        try:
            a_color = (announcement.pet.color or '').lower()
            c_color = (c.pet.color or '').lower()
            if a_color and c_color and (a_color in c_color or c_color in a_color):
                score += 0.1
        except Exception:
            pass

        # date proximity (created_at)
        try:
            days = abs((announcement.created_at - c.created_at).days)
            # within 30 days gets better score
            date_score = max(0.0, 1 - (days / 30.0))
            score += 0.1 * date_score
        except Exception:
            pass

        # description similarity
        try:
            desc_sim = text_similarity(announcement.description or '', c.description or '')
            score += 0.1 * desc_sim
        except Exception:
            pass

        if score >= threshold:
            results.append((c, score))

    # sort by score desc
    results.sort(key=lambda x: x[1], reverse=True)
    return results[:limit]