import sqlite3
import sys

def add_username_field():
    try:
        # Connect to the database
        conn = sqlite3.connect('fileshare.db')
        cursor = conn.cursor()
        
        # Check if username column already exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'username' in columns:
            print("Username column already exists")
            return
        
        # Add the username column (temporarily nullable)
        cursor.execute("ALTER TABLE users ADD COLUMN username VARCHAR(50)")
        print("Added username column")
        
        # Set default usernames based on email (before @ symbol)
        cursor.execute("""
            UPDATE users 
            SET username = LOWER(SUBSTR(email, 1, INSTR(email, '@') - 1)) || '_' || SUBSTR(HEX(RANDOMBLOB(2)), 1, 4)
            WHERE username IS NULL
        """)
        print("Set default usernames for existing users")
        
        # Create index on username
        cursor.execute("CREATE UNIQUE INDEX idx_users_username ON users(username)")
        print("Created unique index on username")
        
        conn.commit()
        print("Migration completed successfully")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    add_username_field()