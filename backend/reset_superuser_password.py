#!/usr/bin/env python3
import sys
sys.path.append('.')
from app.core.security import get_password_hash
import sqlite3

# Reset superuser password
email = "asemu93@hotmail.com"
new_password = "Admin123456"
password_hash = get_password_hash(new_password)

conn = sqlite3.connect('fileshare.db')
cursor = conn.cursor()

# Update password
cursor.execute("""
    UPDATE users 
    SET password_hash = ?
    WHERE email = ?
""", (password_hash, email))

if cursor.rowcount > 0:
    print(f"✅ Password reset for superuser: {email}")
    print(f"New password: {new_password}")
else:
    print(f"❌ User not found: {email}")

conn.commit()
conn.close()