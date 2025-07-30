#!/usr/bin/env python3
"""
Add missing columns to files table
"""
import sqlite3
import sys

def add_missing_columns():
    try:
        conn = sqlite3.connect('fileshare.db')
        cursor = conn.cursor()
        
        # List of columns to add with their types and defaults
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
                    print(f"✅ Added column {col_name}")
                except sqlite3.OperationalError as e:
                    if "duplicate column name" not in str(e):
                        print(f"❌ Error adding column {col_name}: {e}")
            else:
                print(f"ℹ️  Column {col_name} already exists")
        
        conn.commit()
        conn.close()
        print("\n✅ Database schema updated successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    add_missing_columns()