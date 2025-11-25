from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text, inspect

sqlite_file_name = "ai_optimism.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)


def migrate_add_ip_address_column():
    """Add ipAddress column to session table if it doesn't exist"""
    try:
        with engine.connect() as conn:
            # Check if table exists first
            inspector = inspect(engine)
            if 'session' not in inspector.get_table_names():
                print("[Migration] Session table doesn't exist yet, will be created by SQLModel")
                return
            
            # Check if column exists
            columns = [col['name'] for col in inspector.get_columns('session')]
            
            if 'ipAddress' not in columns:
                print("[Migration] Adding ipAddress column to session table...")
                conn.execute(text("ALTER TABLE session ADD COLUMN ipAddress TEXT"))
                conn.commit()
                print("[Migration] Successfully added ipAddress column")
            else:
                print("[Migration] ipAddress column already exists")
    except Exception as e:
        print(f"[Migration] Error adding ipAddress column: {e}")
        # Don't fail startup if migration fails - column might already exist or table might not exist yet


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    # Run migrations after creating tables
    migrate_add_ip_address_column()


def get_session():
    with Session(engine) as session:
        yield session
