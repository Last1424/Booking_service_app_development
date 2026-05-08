from datetime import datetime
from decimal import Decimal

from flask import Blueprint, request, jsonify

from app import db
from app.models import User, Court, Reservation, Equipment, NotificationLog, SPORTS
from app.utils import auth_required

admin_bp = Blueprint("admin", __name__)


@admin_bp.get("/bookings")
@auth_required(admin_only=True)
def all_bookings():
    scope = request.args.get("scope", "all")
    q = Reservation.query
    if scope == "upcoming":
        q = q.filter(Reservation.start_time >= datetime.utcnow(), Reservation.status == "confirmed")
    elif scope == "active":
        q = q.filter(Reservation.status == "confirmed")
    bookings = q.order_by(Reservation.start_time.desc()).all()
    return jsonify(bookings=[b.to_dict() for b in bookings])


@admin_bp.get("/users")
@auth_required(admin_only=True)
def all_users():
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify(users=[u.to_dict() for u in users])


@admin_bp.get("/stats")
@auth_required(admin_only=True)
def stats():
    return jsonify(
        users=User.query.count(),
        courts=Court.query.count(),
        confirmed_bookings=Reservation.query.filter_by(status="confirmed").count(),
        upcoming_bookings=Reservation.query.filter(
            Reservation.status == "confirmed",
            Reservation.start_time >= datetime.utcnow(),
        ).count(),
    )


@admin_bp.post("/courts")
@auth_required(admin_only=True)
def create_court():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    sport = data.get("sport")
    rate = data.get("hourly_rate")
    notes = data.get("notes")

    if not name or sport not in SPORTS or rate is None:
        return jsonify(error="name, sport (tennis|badminton|pickleball) and hourly_rate required"), 400

    court = Court(name=name, sport=sport, hourly_rate=Decimal(str(rate)), notes=notes, status="open")
    db.session.add(court)
    db.session.commit()
    return jsonify(court=court.to_dict()), 201


@admin_bp.patch("/courts/<int:court_id>")
@auth_required(admin_only=True)
def update_court(court_id: int):
    court = Court.query.get_or_404(court_id)
    data = request.get_json(silent=True) or {}

    if "name" in data:
        court.name = data["name"].strip()
    if "status" in data:
        if data["status"] not in ("open", "closed"):
            return jsonify(error="status must be open|closed"), 400
        court.status = data["status"]
    if "hourly_rate" in data:
        court.hourly_rate = Decimal(str(data["hourly_rate"]))
    if "notes" in data:
        court.notes = data["notes"]
    if "sport" in data:
        if data["sport"] not in SPORTS:
            return jsonify(error=f"sport must be one of {SPORTS}"), 400
        court.sport = data["sport"]

    db.session.commit()
    return jsonify(court=court.to_dict())


@admin_bp.post("/equipment")
@auth_required(admin_only=True)
def create_equipment():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    sport = data.get("sport")
    stock = data.get("stock", 0)
    rate = data.get("hourly_rate", 0)

    if not name or sport not in SPORTS:
        return jsonify(error="name and sport required"), 400

    eq = Equipment(name=name, sport=sport, stock=int(stock), hourly_rate=Decimal(str(rate)))
    db.session.add(eq)
    db.session.commit()
    return jsonify(equipment=eq.to_dict()), 201


@admin_bp.patch("/equipment/<int:eq_id>")
@auth_required(admin_only=True)
def update_equipment(eq_id: int):
    eq = Equipment.query.get_or_404(eq_id)
    data = request.get_json(silent=True) or {}
    if "name" in data:
        eq.name = data["name"].strip()
    if "stock" in data:
        eq.stock = int(data["stock"])
    if "hourly_rate" in data:
        eq.hourly_rate = Decimal(str(data["hourly_rate"]))
    if "sport" in data:
        if data["sport"] not in SPORTS:
            return jsonify(error=f"sport must be one of {SPORTS}"), 400
        eq.sport = data["sport"]
    db.session.commit()
    return jsonify(equipment=eq.to_dict())


@admin_bp.delete("/equipment/<int:eq_id>")
@auth_required(admin_only=True)
def delete_equipment(eq_id: int):
    eq = Equipment.query.get_or_404(eq_id)
    db.session.delete(eq)
    db.session.commit()
    return jsonify(ok=True)


@admin_bp.get("/notifications")
@auth_required(admin_only=True)
def notifications():
    logs = NotificationLog.query.order_by(NotificationLog.sent_at.desc()).limit(100).all()
    return jsonify(notifications=[n.to_dict() for n in logs])
