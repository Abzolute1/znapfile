#!/usr/bin/env python3
"""
Simple migration to add missing columns
"""
import sqlite3

# Connect to database
conn = sqlite3.connect('fileshare.db')
cursor = conn.cursor()

# Check which columns already exist
cursor.execute("PRAGMA table_info(files)")
existing_columns = [col[1] for col in cursor.fetchall()]

print(f"Existing columns: {existing_columns}")

# Add missing columns
if 'last_download_at' not in existing_columns:
    try:
        cursor.execute("ALTER TABLE files ADD COLUMN last_download_at TIMESTAMP")
        print("Added last_download_at column")
    except Exception as e:
        print(f"Error adding last_download_at: {e}")

if 'unique_downloaders' not in existing_columns:
    try:
        cursor.execute("ALTER TABLE files ADD COLUMN unique_downloaders INTEGER DEFAULT 0 NOT NULL")
        print("Added unique_downloaders column")
    except Exception as e:
        print(f"Error adding unique_downloaders: {e}")

if 'bandwidth_used' not in existing_columns:
    try:
        cursor.execute("ALTER TABLE files ADD COLUMN bandwidth_used BIGINT DEFAULT 0 NOT NULL")
        print("Added bandwidth_used column")
    except Exception as e:
        print(f"Error adding bandwidth_used: {e}")

# Commit changes
conn.commit()
print("Migration completed!")

conn.close()