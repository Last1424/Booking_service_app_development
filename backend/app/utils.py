from datetime import datetime, timedelta
from functools import wraps

import jwt
from flask import current_app, request, jsonify

from app.models import User


def make_token(user: User) -> str:
    payload = {
        "sub": user.id,
        "role": user.role,
        "email": user.email,
        "exp": datetime.utcnow() + timedelta(hours=current_app.config["JWT_EXPIRES_HOURS"]),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET"], algorithm="HS256")


def decode_token(token: str):
    return jwt.decode(token, current_app.config["JWT_SECRET"], algorithms=["HS256"])


def _extract_token():
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth.split(" ", 1)[1].strip()
    return None


def auth_required(admin_only: bool = False):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            token = _extract_token()
            if not token:
                return jsonify(error="Missing token"), 401
            try:
                payload = decode_token(token)
            except jwt.ExpiredSignatureError:
                return jsonify(error="Token expired"), 401
            except jwt.InvalidTokenError:
                return jsonify(error="Invalid token"), 401

            user = User.query.get(payload.get("sub"))
            if not user:
                return jsonify(error="User not found"), 401
            if admin_only and user.role != "admin":
                return jsonify(error="Admin access required"), 403

            request.current_user = user
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def parse_iso(value: str) -> datetime:
    if value.endswith("Z"):
        value = value[:-1]
    return datetime.fromisoformat(value)
