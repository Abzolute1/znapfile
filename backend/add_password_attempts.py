"""
Add max_password_attempts and failed_password_attempts columns to files table
"""
import sqlite3

def add_password_attempts_columns():
    """Add password attempt tracking columns to files table"""
    conn = sqlite3.connect('fileshare.db')
    cursor = conn.cursor()
    
    try:
        # Check if columns already exist by querying the table schema
        cursor.execute("PRAGMA table_info(files)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        # Add max_password_attempts column if it doesn't exist
        if 'max_password_attempts' not in column_names:
            print("Adding max_password_attempts column...")
            cursor.execute("""
                ALTER TABLE files 
                ADD COLUMN max_password_attempts INTEGER DEFAULT 10
            """)
            print("✓ Added max_password_attempts column")
        else:
            print("✓ max_password_attempts column already exists")
            
        # Add failed_password_attempts column if it doesn't exist
        if 'failed_password_attempts' not in column_names:
            print("Adding failed_password_attempts column...")
            cursor.execute("""
                ALTER TABLE files 
                ADD COLUMN failed_password_attempts INTEGER DEFAULT 0
            """)
            print("✓ Added failed_password_attempts column")
        else:
            print("✓ failed_password_attempts column already exists")
        
        conn.commit()
        print("\n✅ Password attempts columns migration complete!")
        
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    add_password_attempts_columns()