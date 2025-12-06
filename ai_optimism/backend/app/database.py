from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text, inspect, MetaData, Table
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

sqlite_file_name = "ai_optimism.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)


# Expected schema for each table
# Format: table_name -> {column_name: (sql_type, nullable)}
EXPECTED_SCHEMA: Dict[str, Dict[str, tuple]] = {
    'session': {
        'ipAddress': ('TEXT', True),  # Optional column for IP tracking
        'version': ('TEXT', True),  # Optional column for frontend version (v1, v2, v3, etc.)
    },
    # Add more tables/columns here as needed for future migrations
}


def check_table_schema(table_name: str, expected_columns: Dict[str, tuple]) -> List[str]:
    """
    Check if a table has all expected columns.
    Returns list of missing column names.
    """
    try:
        inspector = inspect(engine)
        
        # Check if table exists
        if table_name not in inspector.get_table_names():
            logger.warning(f"[Schema Check] Table '{table_name}' does not exist yet")
            return []
        
        # Get existing columns
        existing_columns = {col['name']: col for col in inspector.get_columns(table_name)}
        missing_columns = []
        
        # Check each expected column
        for col_name, (col_type, nullable) in expected_columns.items():
            if col_name not in existing_columns:
                missing_columns.append(col_name)
                logger.info(f"[Schema Check] Missing column '{col_name}' in table '{table_name}'")
        
        return missing_columns
    except Exception as e:
        logger.error(f"[Schema Check] Error checking table '{table_name}': {e}")
        return []


def add_missing_columns(table_name: str, missing_columns: List[str], expected_columns: Dict[str, tuple]) -> bool:
    """
    Add missing columns to a table.
    Returns True if all columns were added successfully, False otherwise.
    """
    if not missing_columns:
        return True
    
    try:
        with engine.connect() as conn:
            for col_name in missing_columns:
                if col_name not in expected_columns:
                    logger.warning(f"[Migration] Column '{col_name}' not in expected schema, skipping")
                    continue
                
                col_type, nullable = expected_columns[col_name]
                nullable_sql = "" if nullable else " NOT NULL"
                
                try:
                    logger.info(f"[Migration] Adding column '{col_name}' ({col_type}) to table '{table_name}'...")
                    conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}{nullable_sql}"))
                    conn.commit()
                    logger.info(f"[Migration] Successfully added column '{col_name}' to '{table_name}'")
                except Exception as e:
                    logger.error(f"[Migration] Failed to add column '{col_name}' to '{table_name}': {e}")
                    # Continue with other columns even if one fails
                    continue
            
            return True
    except Exception as e:
        logger.error(f"[Migration] Error adding columns to '{table_name}': {e}")
        return False


def verify_database_schema():
    """
    Verify database schema and add any missing columns.
    This is a safety measure to handle cases where the database structure
    doesn't match the expected model definitions.
    """
    try:
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        if not existing_tables:
            logger.info("[Schema Check] No tables exist yet - will be created by SQLModel")
            return
        
        logger.info(f"[Schema Check] Verifying schema for {len(EXPECTED_SCHEMA)} table(s)...")
        
        for table_name, expected_columns in EXPECTED_SCHEMA.items():
            if table_name not in existing_tables:
                logger.info(f"[Schema Check] Table '{table_name}' doesn't exist yet, will be created by SQLModel")
                continue
            
            # Check for missing columns
            missing_columns = check_table_schema(table_name, expected_columns)
            
            if missing_columns:
                logger.warning(f"[Schema Check] Table '{table_name}' is missing {len(missing_columns)} column(s): {missing_columns}")
                # Attempt to add missing columns
                success = add_missing_columns(table_name, missing_columns, expected_columns)
                if success:
                    logger.info(f"[Schema Check] Successfully updated schema for '{table_name}'")
                else:
                    logger.error(f"[Schema Check] Failed to update schema for '{table_name}' - some columns may be missing")
            else:
                logger.info(f"[Schema Check] Table '{table_name}' schema is up to date")
    
    except Exception as e:
        logger.error(f"[Schema Check] Error verifying database schema: {e}")
        # Don't fail startup - log the error and continue
        # The application may still work if only optional columns are missing


def create_db_and_tables():
    """
    Create database tables and verify schema.
    This function is called on application startup.
    """
    try:
        # Create all tables defined in SQLModel
        SQLModel.metadata.create_all(engine)
        logger.info("[Database] Tables created/verified")
        
        # Verify schema and add any missing columns (safety measure)
        verify_database_schema()
    except Exception as e:
        logger.error(f"[Database] Error creating/verifying database: {e}")
        # Don't fail startup - log the error
        # The application may still work if migrations fail


def get_session():
    with Session(engine) as session:
        yield session


def handle_missing_column_error(error: Exception, table_name: str, column_name: str) -> bool:
    """
    Handle database errors related to missing columns.
    Attempts to add the missing column if it's in the expected schema.
    Returns True if the error was handled, False otherwise.
    """
    error_str = str(error).lower()
    
    # Check if this is a missing column error
    if 'no such column' in error_str and column_name.lower() in error_str:
        logger.warning(f"[Error Handler] Missing column '{column_name}' in table '{table_name}' detected during query")
        
        # Check if this column is in our expected schema
        if table_name in EXPECTED_SCHEMA and column_name in EXPECTED_SCHEMA[table_name]:
            logger.info(f"[Error Handler] Attempting to add missing column '{column_name}' to '{table_name}'...")
            success = add_missing_columns(table_name, [column_name], EXPECTED_SCHEMA[table_name])
            if success:
                logger.info(f"[Error Handler] Successfully added column '{column_name}' - operation can be retried")
                return True
            else:
                logger.error(f"[Error Handler] Failed to add column '{column_name}' - manual intervention may be required")
        
        return False
    
    return False
