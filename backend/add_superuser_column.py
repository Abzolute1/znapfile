#!/usr/bin/env python3
"""
Add is_superuser column to users table
"""
import sqlite3
import sys

def add_superuser_column():
    try:
        # Connect to the database
        conn = sqlite3.connect('fileshare.db')
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'is_superuser' not in columns:
            # Add the column
            cursor.execute("ALTER TABLE users ADD COLUMN is_superuser BOOLEAN DEFAULT 0")
            print("✅ Added is_superuser column to users table")
            
            # Update existing superuser if they exist
            cursor.execute("""
                UPDATE users 
                SET is_superuser = 1, 
                    email_verified = 1,
                    tier = 'MAX'
                WHERE LOWER(email) = 'asemu93@hotmail.com'
            """)
            
            if cursor.rowcount > 0:
                print(f"✅ Updated existing superuser account")
            
            conn.commit()
        else:
            print("ℹ️  is_superuser column already exists")
            
            # Still update the superuser if they exist
            cursor.execute("""
                UPDATE users 
                SET is_superuser = 1, 
                    email_verified = 1,
                    tier = 'MAX'
                WHERE LOWER(email) = 'asemu93@hotmail.com'
            """)
            
            if cursor.rowcount > 0:
                print(f"✅ Updated existing superuser account")
                conn.commit()
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    add_superuser_column()