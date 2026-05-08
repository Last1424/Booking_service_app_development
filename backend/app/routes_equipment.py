from flask import Blueprint, request, jsonify

from app.models import Equipment, SPORTS

equipment_bp = Blueprint("equipment", __name__)


@equipment_bp.get("")
def list_equipment():
    sport = request.args.get("sport")
    q = Equipment.query
    if sport:
        if sport not in SPORTS:
            return jsonify(error=f"sport must be one of {SPORTS}"), 400
        q = q.filter_by(sport=sport)
    items = q.order_by(Equipment.sport, Equipment.name).all()
    return jsonify(equipment=[e.to_dict() for e in items])
