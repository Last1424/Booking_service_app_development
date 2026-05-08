from app import db
from app.models import NotificationLog


def log_notification(user, channel: str, subject: str, message: str):
    recipient = (user.email if channel == "email" else (user.phone or user.email)) if user else "unknown"
    entry = NotificationLog(
        user_id=user.id if user else None,
        channel=channel,
        recipient=recipient,
        subject=subject,
        message=message,
    )
    db.session.add(entry)
    print(f"[NOTIF/{channel}] -> {recipient} | {subject} :: {message}")
    return entry


def notify_booking_confirmed(user, reservation):
    msg = (
        f"Booking #{reservation.id} confirmed for {reservation.court.name} "
        f"({reservation.court.sport}) on {reservation.start_time:%Y-%m-%d %H:%M}. "
        f"Total: ${float(reservation.total_price):.2f}."
    )
    log_notification(user, "email", "Booking confirmed", msg)
    log_notification(user, "sms", "Booking confirmed", msg)


def notify_booking_cancelled(user, reservation):
    msg = (
        f"Booking #{reservation.id} for {reservation.court.name} "
        f"on {reservation.start_time:%Y-%m-%d %H:%M} has been cancelled."
    )
    log_notification(user, "email", "Booking cancelled", msg)
    log_notification(user, "sms", "Booking cancelled", msg)
