import sqlite3
import os

# Connect to the database
db_path = "fileshare.db"
if not os.path.exists(db_path):
    print(f"Database file {db_path} not found!")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Updating user tiers in database...")

try:
    # Check current users and their tiers
    cursor.execute("SELECT id, email, tier FROM users")
    users = cursor.fetchall()
    
    print(f"Found {len(users)} users")
    for user in users:
        user_id, email, tier = user
        print(f"  - {email}: {tier}")
        
        # Update any 'premium' tiers to 'pro' (in case there are any)
        if tier == 'premium':
            cursor.execute("UPDATE users SET tier = 'pro' WHERE id = ?", (user_id,))
            print(f"    Updated from 'premium' to 'pro'")
    
    conn.commit()
    print("\nUser tiers updated successfully!")
    
except sqlite3.Error as e:
    print(f"Database error: {e}")
    conn.rollback()
finally:
    conn.close()