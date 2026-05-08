from datetime import datetime, timedelta
from decimal import Decimal

from flask import Blueprint, request, jsonify

from app import db
from app.models import Court, Reservation, Equipment, RentalItem
from app.utils import auth_required, parse_iso
from app.notifications import notify_booking_confirmed, notify_booking_cancelled

bookings_bp = Blueprint("bookings", __name__)


@bookings_bp.post("")
@auth_required()
def create_booking():
    user = request.current_user
    data = request.get_json(silent=True) or {}

    court_id = data.get("court_id")
    start_raw = data.get("start_time")
    rentals_in = data.get("rentals", [])

    if not court_id or not start_raw:
        return jsonify(error="court_id and start_time are required"), 400

    try:
        start = parse_iso(start_raw).replace(minute=0, second=0, microsecond=0)
    except ValueError:
        return jsonify(error="start_time must be ISO 8601"), 400
    end = start + timedelta(hours=1)

    if start < datetime.utcnow():
        return jsonify(error="Cannot book a slot in the past"), 400

    court = Court.query.get(court_id)
    if not court:
        return jsonify(error="Court not found"), 404
    if court.status != "open":
        return jsonify(error="Court is closed"), 400

    conflict = Reservation.query.filter(
        Reservation.court_id == court_id,
        Reservation.status == "confirmed",
        Reservation.start_time == start,
    ).first()
    if conflict:
        return jsonify(error="That slot is already booked"), 409

    total = Decimal(court.hourly_rate)
    rental_records = []
    if isinstance(rentals_in, list):
        for r in rentals_in:
            eq_id = r.get("equipment_id")
            qty = int(r.get("quantity", 1))
            if not eq_id or qty < 1:
                continue
            eq = Equipment.query.get(eq_id)
            if not eq:
                return jsonify(error=f"Equipment {eq_id} not found"), 404
            if eq.sport != court.sport:
                return jsonify(error=f"{eq.name} doesn't match {court.sport} courts"), 400
            if eq.stock < qty:
                return jsonify(error=f"Not enough stock for {eq.name}"), 409
            line = Decimal(eq.hourly_rate) * qty
            total += line
            rental_records.append((eq, qty, line))

    reservation = Reservation(
        user_id=user.id,
        court_id=court.id,
        start_time=start,
        end_time=end,
        total_price=total,
        status="confirmed",
    )
    db.session.add(reservation)
    db.session.flush()

    for eq, qty, line in rental_records:
        db.session.add(RentalItem(
            reservation_id=reservation.id,
            equipment_id=eq.id,
            quantity=qty,
            line_price=line,
        ))
        eq.stock -= qty

    notify_booking_confirmed(user, reservation)
    db.session.commit()

    return jsonify(reservation=reservation.to_dict()), 201


@bookings_bp.get("/mine")
@auth_required()
def list_mine():
    user = request.current_user
    bookings = (
        Reservation.query.filter_by(user_id=user.id)
        .order_by(Reservation.start_time.desc())
        .all()
    )
    return jsonify(bookings=[b.to_dict() for b in bookings])


@bookings_bp.post("/<int:booking_id>/cancel")
@auth_required()
def cancel(booking_id: int):
    user = request.current_user
    res = Reservation.query.get_or_404(booking_id)

    if res.user_id != user.id and user.role != "admin":
        return jsonify(error="Not allowed"), 403
    if res.status == "cancelled":
        return jsonify(error="Already cancelled"), 400
    if res.start_time <= datetime.utcnow():
        return jsonify(error="Cannot cancel a past or in-progress booking"), 400

    res.status = "cancelled"
    for item in res.rentals:
        if item.equipment:
            item.equipment.stock += item.quantity

    notify_booking_cancelled(res.user, res)
    db.session.commit()
    return jsonify(reservation=res.to_dict())
