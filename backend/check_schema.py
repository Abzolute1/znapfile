#!/usr/bin/env python3
import sqlite3

conn = sqlite3.connect('fileshare.db')
cursor = conn.cursor()

# Check files table schema
print("Files table schema:")
cursor.execute("PRAGMA table_info(files)")
columns = cursor.fetchall()
for col in columns:
    print(f"  {col[1]} - {col[2]}")

print("\nChecking for potentially missing columns...")
expected_columns = [
    'id', 'user_id', 'folder_id', 'original_filename', 'stored_filename',
    'file_size', 'mime_type', 'short_code', 'password_hash', 'expires_at',
    'download_count', 'max_downloads', 'created_at', 'deleted', 'description',
    'notes', 'is_public', 'allow_comments', 'version', 'parent_file_id'
]

actual_columns = [col[1] for col in columns]
missing = [col for col in expected_columns if col not in actual_columns]

if missing:
    print(f"Missing columns: {missing}")
else:
    print("All expected columns are present")

conn.close()