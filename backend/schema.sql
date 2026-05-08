-- Court Booking System schema (MySQL 8)
-- Run this once to create the database. Tables are created by SQLAlchemy at first run.

CREATE DATABASE IF NOT EXISTS court_booking
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Optional: dedicated user (uncomment and set a password to use)
-- CREATE USER IF NOT EXISTS 'booking'@'localhost' IDENTIFIED BY 'change_me';
-- GRANT ALL PRIVILEGES ON court_booking.* TO 'booking'@'localhost';
-- FLUSH PRIVILEGES;

USE court_booking;

-- Reference schema (SQLAlchemy will create equivalents automatically):
--
-- users(id, name, email UNIQUE, phone, password_hash, role ENUM('user','admin'), created_at)
-- courts(id, name, sport ENUM('tennis','badminton','pickleball'), hourly_rate, status ENUM('open','closed'), notes)
-- equipment(id, name, sport ENUM(...), stock, hourly_rate)
-- reservations(id, user_id FK, court_id FK, start_time, end_time, total_price,
--              status ENUM('confirmed','cancelled'), created_at)
-- rental_items(id, reservation_id FK, equipment_id FK, quantity, line_price)
-- notification_logs(id, user_id FK, channel ENUM('email','sms'), recipient, subject, message, sent_at)
