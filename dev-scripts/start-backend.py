#!/usr/bin/env python3
import subprocess
import sys
import os

# Change to backend directory
os.chdir('backend')

# Install dependencies if needed
print("Checking dependencies...")
subprocess.run([sys.executable, "-m", "pip", "install", "-q", "-r", "requirements.txt"])

# Run the backend
print("Starting backend server...")
print("Backend will be available at: http://localhost:8000")
print("API Documentation: http://localhost:8000/docs")
print("")

subprocess.run([
    sys.executable, "-m", "uvicorn", 
    "app.main:app", 
    "--reload", 
    "--host", "0.0.0.0", 
    "--port", "8000"
])