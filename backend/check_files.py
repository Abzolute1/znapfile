#!/usr/bin/env python3
import sqlite3
from datetime import datetime

conn = sqlite3.connect('fileshare.db')
cursor = conn.cursor()

# Check recent files
print("Recent files:")
cursor.execute("""
    SELECT id, original_filename, user_id, short_code, created_at, expires_at, deleted
    FROM files 
    ORDER BY created_at DESC 
    LIMIT 10
""")

for row in cursor.fetchall():
    print(f"ID: {row[0][:8]}... | File: {row[1]} | User: {row[2][:8] if row[2] else 'None'}... | Code: {row[3]} | Created: {row[4]} | Expires: {row[5]} | Deleted: {row[6]}")

print("\nUser info:")
cursor.execute("""
    SELECT id, email, tier, email_verified, is_superuser
    FROM users
    WHERE email = 'asemu93@hotmail.com'
""")

for row in cursor.fetchall():
    print(f"ID: {row[0][:8]}... | Email: {row[1]} | Tier: {row[2]} | Verified: {row[3]} | Superuser: {row[4]}")

conn.close()