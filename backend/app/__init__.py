from flask import Flask, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

from config import Config

db = SQLAlchemy()


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, resources={r"/api/*": {"origins": "*"}})
    db.init_app(app)

    from app.auth import auth_bp
    from app.routes_courts import courts_bp
    from app.routes_bookings import bookings_bp
    from app.routes_equipment import equipment_bp
    from app.routes_admin import admin_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(courts_bp, url_prefix="/api/courts")
    app.register_blueprint(bookings_bp, url_prefix="/api/bookings")
    app.register_blueprint(equipment_bp, url_prefix="/api/equipment")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")

    @app.get("/api/health")
    def health():
        return jsonify(status="ok")

    @app.errorhandler(404)
    def not_found(_):
        return jsonify(error="Not found"), 404

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify(error=str(e.description) if hasattr(e, "description") else "Bad request"), 400

    return app
