import sys
import os

# Add your project directory to the sys.path
project_home = '/home/yourusername/znapfile'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# Import your FastAPI app
from app.main import app

# Create the application for PythonAnywhere
application = app