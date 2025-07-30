#!/usr/bin/env python3
"""Add performance indexes to improve query speed"""

import asyncio
from sqlalchemy import text
from app.db.base import engine


async def add_indexes():
    """Add missing indexes for performance optimization"""
    
    indexes = [
        # Files table indexes
        ("idx_files_user_id", "files", "user_id"),
        ("idx_files_deleted", "files", "deleted"),
        ("idx_files_expires_at", "files", "expires_at"),
        ("idx_files_short_code", "files", "short_code"),  # Already exists but let's ensure
        
        # Composite index for common query pattern
        ("idx_files_user_expires_deleted", "files", "user_id, expires_at, deleted"),
        
        # Users table indexes
        ("idx_users_email", "users", "LOWER(email)"),  # Case-insensitive email lookup
        ("idx_users_stripe_customer", "users", "stripe_customer_id"),
        
        # Collection indexes
        ("idx_collections_slug", "collections", "slug"),  # Already exists but ensure
        ("idx_collections_user_id", "collections", "user_id"),
        
        # Collection items indexes
        ("idx_collection_items_collection", "collection_items", "collection_id"),
        ("idx_collection_items_file", "collection_items", "file_id"),
        ("idx_collection_items_composite", "collection_items", "collection_id, file_id"),
        
        # File shares indexes
        ("idx_file_shares_file", "file_shares", "file_id"),
        ("idx_file_shares_shared_with", "file_shares", "shared_with_id"),
        
        # Download logs index
        ("idx_download_logs_file", "download_logs", "file_id"),
        
        # File comments index
        ("idx_file_comments_file", "file_comments", "file_id"),
    ]
    
    async with engine.begin() as conn:
        # Get existing indexes
        result = await conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='index'")
        )
        existing_indexes = {row[0] for row in result}
        
        created_count = 0
        skipped_count = 0
        
        for index_name, table_name, columns in indexes:
            if index_name in existing_indexes:
                print(f"⏭️  Index {index_name} already exists, skipping...")
                skipped_count += 1
                continue
            
            try:
                await conn.execute(text(f"""
                    CREATE INDEX {index_name} 
                    ON {table_name} ({columns})
                """))
                print(f"✅ Created index: {index_name} on {table_name}({columns})")
                created_count += 1
            except Exception as e:
                if "already exists" in str(e):
                    print(f"ℹ️  Index {index_name} already exists")
                    skipped_count += 1
                else:
                    print(f"❌ Error creating index {index_name}: {e}")
        
        print(f"\n📊 Summary:")
        print(f"   Created: {created_count} indexes")
        print(f"   Skipped: {skipped_count} indexes (already exist)")
        print(f"   Total:   {len(indexes)} indexes checked")
        
        # Analyze tables to update statistics
        print("\n🔍 Analyzing tables to update statistics...")
        tables = ["files", "users", "collections", "collection_items", 
                  "file_shares", "download_logs", "file_comments"]
        
        for table in tables:
            try:
                await conn.execute(text(f"ANALYZE {table}"))
                print(f"   ✓ Analyzed {table}")
            except Exception as e:
                print(f"   ✗ Failed to analyze {table}: {e}")
        
        print("\n✨ Database optimization complete!")


if __name__ == "__main__":
    print("🚀 Adding performance indexes to database...")
    asyncio.run(add_indexes())