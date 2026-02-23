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