from urllib.parse import parse_qs

from asgiref.sync import sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from jwt import DecodeError, ExpiredSignatureError
from rest_framework_simplejwt.authentication import JWTAuthentication


@sync_to_async
def get_user_from_token(token):
    jwt_auth = JWTAuthentication()
    try:
        validated_token = jwt_auth.get_validated_token(token)
        return jwt_auth.get_user(validated_token)
    except (DecodeError, ExpiredSignatureError, Exception):
        return AnonymousUser()


class JwtAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        token = parse_qs(query_string).get("token", [None])[0]

        if token:
            scope["user"] = await get_user_from_token(token)
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)

