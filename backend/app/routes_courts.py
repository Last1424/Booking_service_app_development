from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify

from app.models import Court, Reservation, SPORTS

courts_bp = Blueprint("courts", __name__)


@courts_bp.get("")
def list_courts():
    sport = request.args.get("sport")
    q = Court.query
    if sport:
        if sport not in SPORTS:
            return jsonify(error=f"sport must be one of {SPORTS}"), 400
        q = q.filter_by(sport=sport)
    return jsonify(courts=[c.to_dict() for c in q.order_by(Court.sport, Court.name).all()])


@courts_bp.get("/sports")
def list_sports():
    return jsonify(sports=list(SPORTS))


@courts_bp.get("/<int:court_id>/availability")
def availability(court_id: int):
    """
    Returns 1-hour slots for a given date.
    Query: ?date=YYYY-MM-DD  (default today)
    Operating hours: 08:00 - 22:00 (14 slots).
    """
    court = Court.query.get_or_404(court_id)
    date_str = request.args.get("date")
    try:
        day = datetime.strptime(date_str, "%Y-%m-%d").date() if date_str else datetime.utcnow().date()
    except ValueError:
        return jsonify(error="date must be YYYY-MM-DD"), 400

    open_hour, close_hour = 8, 22
    day_start = datetime.combine(day, datetime.min.time()).replace(hour=open_hour)
    day_end = datetime.combine(day, datetime.min.time()).replace(hour=close_hour)

    bookings = (
        Reservation.query.filter(
            Reservation.court_id == court_id,
            Reservation.status == "confirmed",
            Reservation.start_time >= day_start,
            Reservation.start_time < day_end,
        ).all()
    )
    booked_starts = {b.start_time.replace(minute=0, second=0, microsecond=0) for b in bookings}

    now = datetime.utcnow()
    slots = []
    cursor = day_start
    while cursor < day_end:
        is_past = cursor < now
        is_booked = cursor in booked_starts
        slots.append({
            "start": cursor.isoformat(),
            "end": (cursor + timedelta(hours=1)).isoformat(),
            "available": (court.status == "open") and (not is_booked) and (not is_past),
            "booked": is_booked,
            "past": is_past,
        })
        cursor += timedelta(hours=1)

    return jsonify(court=court.to_dict(), date=str(day), slots=slots)
