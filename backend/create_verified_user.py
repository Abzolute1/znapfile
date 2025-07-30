#!/usr/bin/env python3
import sys
sys.path.append('.')
from app.core.security import get_password_hash
import sqlite3
import secrets
from datetime import datetime, timezone

# Create a verified test user
email = "testverified@example.com"
password = "Test123!@#"
password_hash = get_password_hash(password)

conn = sqlite3.connect('fileshare.db')
cursor = conn.cursor()

# Check if user exists
cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
existing = cursor.fetchone()

if existing:
    # Update to verified
    cursor.execute("""
        UPDATE users 
        SET email_verified = 1, 
            email_verified_at = ?, 
            tier = 'FREE'
        WHERE email = ?
    """, (datetime.now(timezone.utc).isoformat(), email))
    print(f"✅ Updated existing user to verified: {email}")
else:
    # Create new verified user
    user_id = secrets.token_hex(16)
    cursor.execute("""
        INSERT INTO users (
            id, email, password_hash, email_verified, email_verified_at,
            created_at, tier, subscription_end_date, is_superuser
        ) VALUES (?, ?, ?, 1, ?, ?, 'FREE', NULL, 0)
    """, (
        user_id,
        email,
        password_hash,
        datetime.now(timezone.utc).isoformat(),
        datetime.now(timezone.utc).isoformat()
    ))
    print(f"✅ Created verified user: {email}")

conn.commit()
conn.close()

print(f"Password: {password}")