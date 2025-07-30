import sqlite3
import os

# Connect to the database
db_path = "fileshare.db"
if not os.path.exists(db_path):
    print(f"Database file {db_path} not found!")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Adding email verification fields to users table...")

try:
    # Add email_verification_token column
    cursor.execute("ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255)")
    print("✓ Added email_verification_token column")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("- email_verification_token column already exists")
    else:
        print(f"✗ Error adding email_verification_token: {e}")

try:
    # Add email_verified_at column
    cursor.execute("ALTER TABLE users ADD COLUMN email_verified_at DATETIME")
    print("✓ Added email_verified_at column")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("- email_verified_at column already exists")
    else:
        print(f"✗ Error adding email_verified_at: {e}")

try:
    # Add verification_token_expires_at column
    cursor.execute("ALTER TABLE users ADD COLUMN verification_token_expires_at DATETIME")
    print("✓ Added verification_token_expires_at column")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("- verification_token_expires_at column already exists")
    else:
        print(f"✗ Error adding verification_token_expires_at: {e}")

conn.commit()
conn.close()

print("\nDatabase schema updated successfully!")