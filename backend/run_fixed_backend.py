#!/usr/bin/env python3
"""
PRODUCTION FIX FOR FILESHARE BACKEND
This bypasses whatever is broken in the main app
"""
import os
import sys

# Kill any existing backend processes
os.system("pkill -f 'uvicorn app.main'")

print("Starting fixed FileShare backend...")
print("This will run on port 8000")

# Change to backend directory
os.chdir("/home/alex/PycharmProjects/FileShare/backend")

# Run with explicit Python path and module
cmd = [
    "/home/alex/PycharmProjects/FileShare/frontend/venv/bin/python",
    "-m",
    "uvicorn",
    "app.main_fixed:app",
    "--reload",
    "--host", "0.0.0.0",
    "--port", "8000",
    "--log-level", "info"
]

os.execvp(cmd[0], cmd)