#!/usr/bin/env python3
"""Add slug column to collections table"""

import sqlite3

def add_slug_column():
    conn = sqlite3.connect('fileshare.db')
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(collections)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'slug' not in columns:
            # Add slug column
            cursor.execute("ALTER TABLE collections ADD COLUMN slug VARCHAR(255)")
            conn.commit()
            print("✅ Added slug column to collections table")
        else:
            print("✅ Slug column already exists")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    add_slug_column()