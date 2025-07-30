import sqlite3
import sys

def add_audit_logs_table():
    try:
        # Connect to the database
        conn = sqlite3.connect('fileshare.db')
        cursor = conn.cursor()
        
        # Create audit_logs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type VARCHAR(50) NOT NULL,
                user_id VARCHAR(36),
                ip_address VARCHAR(45) NOT NULL,
                user_agent VARCHAR(500),
                resource_id VARCHAR(100),
                details TEXT,
                severity VARCHAR(20) DEFAULT 'info',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address)")
        
        conn.commit()
        print("Audit logs table created successfully")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    add_audit_logs_table()