#!/usr/bin/env python3
"""
Comprehensive startup check to ensure everything is properly configured
"""
import os
import sys
import sqlite3
from datetime import datetime

def check_startup():
    print("🔍 Running FileShare Startup Checks...")
    print("-" * 50)
    
    errors = []
    warnings = []
    
    # Check database exists
    if not os.path.exists('fileshare.db'):
        errors.append("❌ Database file 'fileshare.db' not found!")
    else:
        print("✅ Database found")
        
        # Check database schema
        try:
            conn = sqlite3.connect('fileshare.db')
            cursor = conn.cursor()
            
            # Check tables exist
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            required_tables = ['users', 'files']
            
            for table in required_tables:
                if table not in tables:
                    errors.append(f"❌ Required table '{table}' not found!")
                else:
                    print(f"✅ Table '{table}' exists")
            
            # Check for superuser
            cursor.execute("SELECT email, tier, email_verified FROM users WHERE email = 'asemu93@hotmail.com'")
            superuser = cursor.fetchone()
            
            if superuser:
                print(f"✅ Superuser found: {superuser[0]} (Tier: {superuser[1]}, Verified: {superuser[2]})")
            else:
                warnings.append("⚠️  Superuser account not found")
            
            conn.close()
            
        except Exception as e:
            errors.append(f"❌ Database error: {e}")
    
    # Check uploads directory
    uploads_dir = os.path.join(os.path.dirname(__file__), '..', 'uploads')
    if not os.path.exists(uploads_dir):
        os.makedirs(uploads_dir, exist_ok=True)
        print(f"✅ Created uploads directory at {os.path.abspath(uploads_dir)}")
    else:
        print(f"✅ Uploads directory exists at {os.path.abspath(uploads_dir)}")
    
    # Check environment
    if os.getenv('ENVIRONMENT') == 'production':
        warnings.append("⚠️  Running in PRODUCTION mode - ensure all services are configured")
    else:
        print("✅ Running in DEVELOPMENT mode")
    
    print("-" * 50)
    
    # Report results
    if errors:
        print("\n🚨 ERRORS FOUND:")
        for error in errors:
            print(f"   {error}")
        print("\n❌ Startup checks FAILED! Please fix errors before running.")
        return False
    
    if warnings:
        print("\n⚠️  WARNINGS:")
        for warning in warnings:
            print(f"   {warning}")
    
    print("\n✅ All startup checks passed! Ready to run.")
    return True

if __name__ == "__main__":
    success = check_startup()
    sys.exit(0 if success else 1)