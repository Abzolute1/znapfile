"""Check collections table schema"""
import sqlite3

conn = sqlite3.connect('fileshare.db')
cursor = conn.cursor()

# Check if collections table exists
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='collections'")
table_exists = cursor.fetchone()

if table_exists:
    print("✅ Collections table exists")
    
    # Get table schema
    cursor.execute("PRAGMA table_info(collections)")
    columns = cursor.fetchall()
    
    print("\nColumns:")
    for col in columns:
        print(f"  - {col[1]} ({col[2]})")
else:
    print("❌ Collections table does not exist")

# Check collection_items table
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='collection_items'")
items_table_exists = cursor.fetchone()

if items_table_exists:
    print("\n✅ Collection_items table exists")
    
    # Get table schema
    cursor.execute("PRAGMA table_info(collection_items)")
    columns = cursor.fetchall()
    
    print("\nColumns:")
    for col in columns:
        print(f"  - {col[1]} ({col[2]})")
else:
    print("\n❌ Collection_items table does not exist")

conn.close()