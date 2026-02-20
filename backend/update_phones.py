import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from django.contrib.auth.models import User
from core.models import Profile   # 🔴 заміни your_app на назву свого app


for i, user in enumerate(User.objects.all(), start=1):

    profile, created = Profile.objects.get_or_create(user=user)

    if created:
        print(f"🆕 Profile created for {user.username}")

    if profile.phone_number == "0000000000" or not profile.phone_number:

        profile.phone_number = f"+380000000{i:03}"
        profile.save()

        print(f"✅ Updated phone for {user.username}")

print("🎉 DONE")