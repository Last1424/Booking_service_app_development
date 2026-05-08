from datetime import datetime
from app import db


SPORTS = ("tennis", "badminton", "pickleball")


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(160), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(40))
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum("user", "admin", name="user_role"), nullable=False, default="user")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Court(db.Model):
    __tablename__ = "courts"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    sport = db.Column(db.Enum(*SPORTS, name="sport"), nullable=False, index=True)
    hourly_rate = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    status = db.Column(db.Enum("open", "closed", name="court_status"), nullable=False, default="open")
    notes = db.Column(db.String(255))

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "sport": self.sport,
            "hourly_rate": float(self.hourly_rate),
            "status": self.status,
            "notes": self.notes,
        }


class Equipment(db.Model):
    __tablename__ = "equipment"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    sport = db.Column(db.Enum(*SPORTS, name="equipment_sport"), nullable=False, index=True)
    stock = db.Column(db.Integer, nullable=False, default=0)
    hourly_rate = db.Column(db.Numeric(10, 2), nullable=False, default=0)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "sport": self.sport,
            "stock": self.stock,
            "hourly_rate": float(self.hourly_rate),
        }


class Reservation(db.Model):
    __tablename__ = "reservations"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    court_id = db.Column(db.Integer, db.ForeignKey("courts.id"), nullable=False, index=True)
    start_time = db.Column(db.DateTime, nullable=False, index=True)
    end_time = db.Column(db.DateTime, nullable=False)
    total_price = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    status = db.Column(
        db.Enum("confirmed", "cancelled", name="reservation_status"),
        nullable=False,
        default="confirmed",
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref="reservations")
    court = db.relationship("Court", backref="reservations")
    rentals = db.relationship("RentalItem", backref="reservation", cascade="all, delete-orphan")

    def to_dict(self, include_rentals=True):
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": self.user.name if self.user else None,
            "court_id": self.court_id,
            "court_name": self.court.name if self.court else None,
            "sport": self.court.sport if self.court else None,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat(),
            "total_price": float(self.total_price),
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_rentals:
            data["rentals"] = [r.to_dict() for r in self.rentals]
        return data


class RentalItem(db.Model):
    __tablename__ = "rental_items"
    id = db.Column(db.Integer, primary_key=True)
    reservation_id = db.Column(db.Integer, db.ForeignKey("reservations.id"), nullable=False, index=True)
    equipment_id = db.Column(db.Integer, db.ForeignKey("equipment.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    line_price = db.Column(db.Numeric(10, 2), nullable=False, default=0)

    equipment = db.relationship("Equipment")

    def to_dict(self):
        return {
            "id": self.id,
            "equipment_id": self.equipment_id,
            "equipment_name": self.equipment.name if self.equipment else None,
            "quantity": self.quantity,
            "line_price": float(self.line_price),
        }


class NotificationLog(db.Model):
    __tablename__ = "notification_logs"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    channel = db.Column(db.Enum("email", "sms", name="notif_channel"), nullable=False)
    recipient = db.Column(db.String(160), nullable=False)
    subject = db.Column(db.String(200))
    message = db.Column(db.Text, nullable=False)
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "channel": self.channel,
            "recipient": self.recipient,
            "subject": self.subject,
            "message": self.message,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
        }
