"""Seed database with admin user, courts, and equipment for all 3 sports."""
from decimal import Decimal

from werkzeug.security import generate_password_hash

from app import create_app, db
from app.models import User, Court, Equipment


def seed():
    app = create_app()
    with app.app_context():
        db.create_all()

        if not User.query.filter_by(email="admin@court.local").first():
            db.session.add(User(
                name="Admin",
                email="admin@court.local",
                phone="0000000000",
                password_hash=generate_password_hash("admin123"),
                role="admin",
            ))

        if not User.query.filter_by(email="player@court.local").first():
            db.session.add(User(
                name="Demo Player",
                email="player@court.local",
                phone="1111111111",
                password_hash=generate_password_hash("player123"),
                role="user",
            ))

        if Court.query.count() == 0:
            db.session.add_all([
                Court(name="Tennis Court 1", sport="tennis", hourly_rate=Decimal("20.00"), status="open"),
                Court(name="Tennis Court 2", sport="tennis", hourly_rate=Decimal("20.00"), status="open"),
                Court(name="Badminton Court A", sport="badminton", hourly_rate=Decimal("12.00"), status="open"),
                Court(name="Badminton Court B", sport="badminton", hourly_rate=Decimal("12.00"), status="open"),
                Court(name="Pickleball Court 1", sport="pickleball", hourly_rate=Decimal("15.00"), status="open"),
            ])

        if Equipment.query.count() == 0:
            db.session.add_all([
                Equipment(name="Tennis Racket", sport="tennis", stock=10, hourly_rate=Decimal("5.00")),
                Equipment(name="Tennis Balls (3-pack)", sport="tennis", stock=20, hourly_rate=Decimal("3.00")),
                Equipment(name="Badminton Racket", sport="badminton", stock=12, hourly_rate=Decimal("4.00")),
                Equipment(name="Shuttlecocks (tube)", sport="badminton", stock=15, hourly_rate=Decimal("3.00")),
                Equipment(name="Pickleball Paddle", sport="pickleball", stock=8, hourly_rate=Decimal("4.00")),
                Equipment(name="Pickleballs (4-pack)", sport="pickleball", stock=10, hourly_rate=Decimal("2.00")),
            ])

        db.session.commit()
        print("Seed complete.")
        print("  admin  -> admin@court.local / admin123")
        print("  player -> player@court.local / player123")


if __name__ == "__main__":
    seed()
