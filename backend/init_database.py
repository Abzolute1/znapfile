#!/usr/bin/env python3
"""
Initialize database with all required columns and ensure consistency
"""
import sqlite3
import sys
from datetime import datetime, timedelta

def init_database():
    """Ensure database has all required columns and is properly initialized"""
    try:
        conn = sqlite3.connect('fileshare.db')
        cursor = conn.cursor()
        
        print("🔧 Initializing FileShare database...")
        
        # Ensure all columns exist in files table
        columns_to_add = [
            ('folder_id', 'CHAR(36)', 'NULL'),
            ('description', 'TEXT', 'NULL'),
            ('notes', 'TEXT', 'NULL'),
            ('is_public', 'BOOLEAN', '0'),
            ('allow_comments', 'BOOLEAN', '1'),
            ('version', 'INTEGER', '1'),
            ('parent_file_id', 'CHAR(36)', 'NULL')
        ]
        
        # Check existing columns
        cursor.execute("PRAGMA table_info(files)")
        existing_columns = [col[1] for col in cursor.fetchall()]
        
        # Add missing columns
        for col_name, col_type, default in columns_to_add:
            if col_name not in existing_columns:
                try:
                    if default == 'NULL':
                        cursor.execute(f"ALTER TABLE files ADD COLUMN {col_name} {col_type}")
                    else:
                        cursor.execute(f"ALTER TABLE files ADD COLUMN {col_name} {col_type} DEFAULT {default}")
                    print(f"  ✅ Added column: {col_name}")
                except sqlite3.OperationalError as e:
                    if "duplicate column name" not in str(e):
                        print(f"  ❌ Error adding column {col_name}: {e}")
        
        # Ensure users table has is_superuser column
        cursor.execute("PRAGMA table_info(users)")
        user_columns = [col[1] for col in cursor.fetchall()]
        
        if 'is_superuser' not in user_columns:
            cursor.execute("ALTER TABLE users ADD COLUMN is_superuser BOOLEAN DEFAULT 0")
            print("  ✅ Added is_superuser column to users table")
        
        # Update superuser account
        cursor.execute("""
            UPDATE users 
            SET is_superuser = 1, 
                email_verified = 1,
                tier = 'MAX'
            WHERE LOWER(email) = 'asemu93@hotmail.com'
        """)
        
        if cursor.rowcount > 0:
            print(f"  ✅ Updated superuser account")
        
        # Fix any expired files for testing (extend by 7 days)
        future_date = datetime.utcnow() + timedelta(days=7)
        cursor.execute("""
            UPDATE files 
            SET expires_at = ? 
            WHERE expires_at < datetime('now')
            AND user_id = (SELECT id FROM users WHERE email = 'asemu93@hotmail.com')
            LIMIT 5
        """, (future_date.isoformat(),))
        
        if cursor.rowcount > 0:
            print(f"  ✅ Extended expiration for {cursor.rowcount} test files")
        
        conn.commit()
        conn.close()
        
        print("\n✅ Database initialization complete!")
        return True
        
    except Exception as e:
        print(f"\n❌ Database initialization failed: {e}")
        return False

if __name__ == "__main__":
    success = init_database()
    sys.exit(0 if success else 1)