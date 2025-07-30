"""Add transfer tracking columns to users table"""
import sqlite3
import sys
from datetime import datetime

def add_transfer_columns():
    """Add monthly_transfer_used and transfer_reset_date columns to users table"""
    conn = sqlite3.connect('fileshare.db')
    cursor = conn.cursor()
    
    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in cursor.fetchall()]
        
        # Add monthly_transfer_used column if it doesn't exist
        if 'monthly_transfer_used' not in columns:
            cursor.execute('''
                ALTER TABLE users 
                ADD COLUMN monthly_transfer_used INTEGER DEFAULT 0
            ''')
            print("✅ Added monthly_transfer_used column to users table")
        else:
            print("ℹ️  monthly_transfer_used column already exists")
            
        # Add transfer_reset_date column if it doesn't exist
        if 'transfer_reset_date' not in columns:
            cursor.execute('''
                ALTER TABLE users 
                ADD COLUMN transfer_reset_date DATETIME
            ''')
            # Set default value for existing rows
            cursor.execute('''
                UPDATE users 
                SET transfer_reset_date = datetime('now')
                WHERE transfer_reset_date IS NULL
            ''')
            print("✅ Added transfer_reset_date column to users table")
        else:
            print("ℹ️  transfer_reset_date column already exists")
        
        conn.commit()
        print("✅ Database updated successfully")
        
    except Exception as e:
        print(f"❌ Error updating database: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    add_transfer_columns()