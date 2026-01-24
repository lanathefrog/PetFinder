import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User
from core.models import Pet, Announcement

def sync():
    # Update Users
    user_map = {
        'svitlanabublyk': ('Svitlana', 'Bublyk'),
        'cat_lover_99': ('Olena', 'Petrenko'),
        'dog_hero': ('Andriy', 'Shevchenko')
    }
    for username, names in user_map.items():
        u = User.objects.filter(username=username).first()
        if u:
            u.first_name, u.last_name = names
            u.save()

    # Update Pets (Adding gender)
    pet_map = {
        'Pedro': 'male',
        'Luna': 'female',
        'Rex': 'male'
    }
    for name, gender in pet_map.items():
        p = Pet.objects.filter(name=name).first()
        if p:
            p.gender = gender
            p.save()

    # Update Announcements (Adding phone)
    Announcement.objects.all().update(contact_phone="+380 99 000 00 00")
    print("Sync complete!")

if __name__ == '__main__':
    sync()