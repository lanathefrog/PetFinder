import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User
from core.models import Announcement, Comment, SavedAnnouncement, Badge, UserBadge, Pet, Location
from core.utils import check_and_assign_badges

def create_user(username, password='testpass'):
    user, created = User.objects.get_or_create(username=username, defaults={'email': f'{username}@example.com'})
    if created:
        user.set_password(password)
        user.save()
    return user

def ensure_pet_and_location(name_suffix='X'):
    pet = Pet.objects.create(name=f'TestPet{name_suffix}', pet_type='dog')
    loc = Location.objects.create(latitude=50.0, longitude=30.0, address='Test Location')
    return pet, loc

def main():
    print('Creating test users and badge scenarios...')

    # 1. Rescuer (1 reunion)
    rescuer = create_user('rescuer_user', 'testpass')
    pet, loc = ensure_pet_and_location('R')
    Announcement.objects.create(pet=pet, owner=rescuer, status='found', location=loc, description='Reunited', is_reunited=True)

    # 2. Hero Rescuer (5 reunions)
    hero = create_user('hero_rescuer', 'testpass')
    for i in range(5):
        p, l = ensure_pet_and_location(f'H{i}')
        Announcement.objects.create(pet=p, owner=hero, status='found', location=l, description='Reunited', is_reunited=True)

    # 3. Active Helper (>=10 comments)
    helper = create_user('active_helper', 'testpass')
    pet_h, loc_h = ensure_pet_and_location('Helper')
    ann = Announcement.objects.create(pet=pet_h, owner=helper, status='lost', location=loc_h, description='Helper announce')
    for i in range(12):
        # comment on someone else's (use rescuer's announcement if exists)
        Comment.objects.create(user=helper, announcement=Announcement.objects.filter(owner__isnull=False).first() or ann, text=f'Helpful comment {i}')

    # 4. Community Supporter (>=10 saves)
    supporter = create_user('supporter_user', 'testpass')
    # create some announcements to save
    anns = Announcement.objects.all()[:20]
    for i, a in enumerate(anns):
        if i >= 12:
            break
        SavedAnnouncement.objects.get_or_create(user=supporter, announcement=a)

    # 5. Early Member
    early = create_user('early_member', 'testpass')
    # award early badge directly if not present
    Badge.objects.get_or_create(name='Early Member', defaults={'description': 'Joined early', 'icon': 'early'})
    early_badge = Badge.objects.get(name='Early Member')
    UserBadge.objects.get_or_create(user=early, badge=early_badge)

    # Run badge checks
    for u in [rescuer, hero, helper, supporter, early]:
        check_and_assign_badges(u)

    print('Done. Users created: rescuer_user, hero_rescuer, active_helper, supporter_user, early_member')

if __name__ == '__main__':
    main()
