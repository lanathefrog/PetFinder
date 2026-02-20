from django.contrib import admin
from .models import Pet, Location, Announcement, Message, Photo, Profile

admin.site.register(Pet)
admin.site.register(Location)
admin.site.register(Announcement)
admin.site.register(Message)
admin.site.register(Photo)
admin.site.register(Profile)
