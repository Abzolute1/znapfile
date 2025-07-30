#!/usr/bin/env python3
"""Install missing backend dependencies"""
import subprocess
import sys
import os

def main():
    print("🔧 Installing missing backend dependencies...")
    
    # Find the Python executable being used
    python_exe = sys.executable
    print(f"Using Python: {python_exe}")
    
    # Install missing dependencies
    deps = [
        "pyotp==2.9.0",
        "pdf2image==1.17.0"
    ]
    
    for dep in deps:
        print(f"Installing {dep}...")
        result = subprocess.run(
            [python_exe, "-m", "pip", "install", dep],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print(f"✅ {dep} installed successfully")
        else:
            print(f"❌ Failed to install {dep}")
            print(result.stderr)
    
    # Also install system dependencies for pdf2image
    print("\n📦 Note: pdf2image requires poppler-utils to be installed on your system")
    print("Run: sudo apt-get install poppler-utils (on Ubuntu/Debian)")
    print("or: brew install poppler (on macOS)")

if __name__ == "__main__":
    main()