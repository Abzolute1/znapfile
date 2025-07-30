import sqlite3
import os

# Connect to the database
db_path = "fileshare.db"
if not os.path.exists(db_path):
    print(f"Database file {db_path} not found!")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print("Tables in database:")
for table in tables:
    print(f"  - {table[0]}")

# Check files table schema
print("\nSchema for 'files' table:")
cursor.execute("PRAGMA table_info(files);")
columns = cursor.fetchall()
for col in columns:
    print(f"  - {col[1]} ({col[2]})")

conn.close()