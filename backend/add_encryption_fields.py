import sqlite3
import sys

def add_encryption_fields():
    try:
        # Connect to the database
        conn = sqlite3.connect('fileshare.db')
        cursor = conn.cursor()
        
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(files)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # Add client_encrypted column
        if 'client_encrypted' not in columns:
            cursor.execute("ALTER TABLE files ADD COLUMN client_encrypted BOOLEAN DEFAULT 0 NOT NULL")
            print("Added client_encrypted column")
        
        # Add encryption_algorithm column
        if 'encryption_algorithm' not in columns:
            cursor.execute("ALTER TABLE files ADD COLUMN encryption_algorithm VARCHAR(50)")
            print("Added encryption_algorithm column")
        
        # Add encrypted_metadata column
        if 'encrypted_metadata' not in columns:
            cursor.execute("ALTER TABLE files ADD COLUMN encrypted_metadata TEXT")
            print("Added encrypted_metadata column")
        
        conn.commit()
        print("Encryption fields added successfully")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    add_encryption_fields()