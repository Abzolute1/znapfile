#!/usr/bin/env python3
import sqlite3

conn = sqlite3.connect('/home/alex/PycharmProjects/FileShare/backend/fileshare.db')
cursor = conn.cursor()

print("Users in database:")
cursor.execute("SELECT id, email, username, tier FROM users LIMIT 5")
for row in cursor.fetchall():
    print(f"  ID: {row[0]}, Email: {row[1]}, Username: {row[2]}, Tier: {row[3]}")

conn.close()