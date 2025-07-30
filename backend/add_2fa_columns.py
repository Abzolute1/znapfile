"""
Add 2FA columns to users table
"""
import sqlite3

def add_2fa_columns():
    """Add 2FA columns to users table"""
    conn = sqlite3.connect('fileshare.db')
    cursor = conn.cursor()
    
    try:
        # Check if columns already exist by querying the table schema
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        # Add two_factor_enabled column if it doesn't exist
        if 'two_factor_enabled' not in column_names:
            print("Adding two_factor_enabled column...")
            cursor.execute("""
                ALTER TABLE users 
                ADD COLUMN two_factor_enabled BOOLEAN DEFAULT 0 NOT NULL
            """)
            print("✓ Added two_factor_enabled column")
        else:
            print("✓ two_factor_enabled column already exists")
            
        # Add two_factor_secret column if it doesn't exist
        if 'two_factor_secret' not in column_names:
            print("Adding two_factor_secret column...")
            cursor.execute("""
                ALTER TABLE users 
                ADD COLUMN two_factor_secret VARCHAR(255)
            """)
            print("✓ Added two_factor_secret column")
        else:
            print("✓ two_factor_secret column already exists")
            
        # Add backup_codes column if it doesn't exist
        if 'backup_codes' not in column_names:
            print("Adding backup_codes column...")
            cursor.execute("""
                ALTER TABLE users 
                ADD COLUMN backup_codes TEXT
            """)
            print("✓ Added backup_codes column")
        else:
            print("✓ backup_codes column already exists")
        
        conn.commit()
        print("\n✅ 2FA columns migration complete!")
        
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    add_2fa_columns()