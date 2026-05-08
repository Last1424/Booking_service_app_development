from app import create_app, db
from config import Config

app = create_app()


@app.cli.command("init-db")
def init_db():
    """Create all tables (use after the database exists)."""
    with app.app_context():
        db.create_all()
        print("Tables created.")


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(host="0.0.0.0", port=Config.FLASK_PORT, debug=True)
