from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

from app import db
from app.models import User
from app.utils import make_token, auth_required

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/signup")
def signup():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    phone = (data.get("phone") or "").strip() or None

    if not name or not email or not password:
        return jsonify(error="name, email, password are required"), 400
    if len(password) < 6:
        return jsonify(error="password must be at least 6 characters"), 400

    if User.query.filter_by(email=email).first():
        return jsonify(error="Email already registered"), 409

    user = User(
        name=name,
        email=email,
        phone=phone,
        password_hash=generate_password_hash(password),
        role="user",
    )
    db.session.add(user)
    db.session.commit()

    token = make_token(user)
    return jsonify(token=token, user=user.to_dict()), 201


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify(error="email and password required"), 400

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify(error="Invalid credentials"), 401

    token = make_token(user)
    return jsonify(token=token, user=user.to_dict())


@auth_bp.get("/me")
@auth_required()
def me():
    return jsonify(user=request.current_user.to_dict())
