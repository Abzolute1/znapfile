#!/usr/bin/env python3
import subprocess
import sys
import os
import time

def run_command(cmd, cwd=None):
    """Run a command and return success status"""
    try:
        subprocess.run(cmd, shell=True, check=True, cwd=cwd)
        return True
    except:
        return False

def main():
    print("🔧 FileShare Setup & Run")
    print("=" * 50)
    
    project_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(project_dir)
    
    # Check if venv exists, if not create it
    venv_path = os.path.join(project_dir, "frontend", "venv")
    if not os.path.exists(venv_path):
        print("📦 Creating virtual environment...")
        run_command(f"{sys.executable} -m venv {venv_path}")
    
    # Determine venv Python path
    if os.name == 'nt':  # Windows
        venv_python = os.path.join(venv_path, "Scripts", "python.exe")
        activate = os.path.join(venv_path, "Scripts", "activate.bat")
    else:  # Unix/Linux/Mac
        venv_python = os.path.join(venv_path, "bin", "python")
        activate = f"source {os.path.join(venv_path, 'bin', 'activate')}"
    
    # Install backend dependencies
    print("\n📚 Checking backend dependencies...")
    backend_dir = os.path.join(project_dir, "backend")
    if not run_command(f"{venv_python} -c 'import fastapi'", cwd=backend_dir):
        print("Installing backend dependencies...")
        run_command(f"{venv_python} -m pip install -r requirements.txt", cwd=backend_dir)
        # Install additional packages that might be missing
        run_command(f"{venv_python} -m pip install aiofiles aiosqlite", cwd=backend_dir)
    
    # Check frontend dependencies
    print("\n🎨 Checking frontend dependencies...")
    frontend_dir = os.path.join(project_dir, "frontend")
    if not os.path.exists(os.path.join(frontend_dir, "node_modules")):
        print("Installing frontend dependencies...")
        run_command("npm install", cwd=frontend_dir)
    
    # Create .env files if they don't exist
    backend_env = os.path.join(backend_dir, ".env")
    if not os.path.exists(backend_env):
        print("\n📝 Creating backend .env file...")
        run_command(f"cp .env.example .env", cwd=backend_dir)
    
    frontend_env = os.path.join(frontend_dir, ".env")
    if not os.path.exists(frontend_env):
        print("📝 Creating frontend .env file...")
        run_command(f"cp .env.example .env", cwd=frontend_dir)
    
    print("\n" + "=" * 50)
    print("✅ Setup complete! Starting servers...")
    print("=" * 50 + "\n")
    
    # Now run the main script with the venv Python
    run_command(f"{venv_python} run.py")

if __name__ == "__main__":
    main()