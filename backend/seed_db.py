import os
import django
import random

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User
from core.models import Pet, Location, Announcement


def seed_data():
    print("Starting database seeding...")

    # 1. Create Users
    users = []
    usernames = ['cat_lover_99', 'dog_hero', 'volunteer_kyiv', 'pet_scout', 'animal_friend']
    for name in usernames:
        user, _ = User.objects.get_or_create(username=name, email=f"{name}@example.com")
        user.set_password('testpass123')
        user.save()
        users.append(user)

    # 2. Create Pets
    pets_data = [
        ('Luna', 'cat', 'Siamese', 'Cream/Brown'),
        ('Rex', 'dog', 'German Shepherd', 'Black/Tan'),
        ('Milo', 'cat', 'Maine Coon', 'Grey Tabby'),
        ('Bella', 'dog', 'Golden Retriever', 'Golden'),
        ('Oliver', 'other', 'Rabbit', 'White'),
        ('Charlie', 'dog', 'Beagle', 'Tricolor')
    ]

    pets = []
    for name, p_type, breed, color in pets_data:
        pet = Pet.objects.create(
            name=name,
            pet_type=p_type,
            breed=breed,
            color=color,
            description=f"A friendly {p_type} named {name}."
        )
        pets.append(pet)

    # 3. Create Locations
    locations_data = [
        (50.4501, 30.5234, "Maidan Nezalezhnosti, Kyiv"),
        (49.8397, 24.0297, "Lviv City Center"),
        (46.4825, 30.7233, "Odesa Opera House"),
        (50.0015, 36.2304, "Kharkiv Freedom Square"),
        (48.4647, 35.0462, "Dnipro Riverside"),
        (48.9226, 24.7111, "Ivano-Frankivsk Town Hall")
    ]

    locations = []
    for lat, lon, addr in locations_data:
        loc = Location.objects.create(latitude=lat, longitude=lon, address=addr)
        locations.append(loc)

    # 4. Create Announcements
    statuses = ['lost', 'found']
    for i in range(6):
        Announcement.objects.create(
            pet=pets[i],
            owner=random.choice(users),
            status=random.choice(statuses),
            location=locations[i],
            description=f"Urgent: {pets[i].name} was seen near {locations[i].address}."
        )

    print(f"Successfully created {len(users)} users, {len(pets)} pets, and {len(locations)} announcements!")


if __name__ == '__main__':
    seed_data()