#!/bin/bash
#
# Production Deployment Script for FileShare
# This script prepares and deploys the application for production
#

set -e  # Exit on any error

echo "🚀 FileShare Production Deployment Script"
echo "========================================"

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo "❌ Please do not run this script as root!"
   exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists python3; then
    echo "❌ Python 3 is not installed"
    exit 1
fi

if ! command_exists node; then
    echo "❌ Node.js is not installed"
    exit 1
fi

if ! command_exists redis-cli; then
    echo "⚠️  Redis is not installed (required for rate limiting)"
fi

echo "✅ Prerequisites check passed"

# Backend deployment
echo -e "\n🔧 Deploying Backend..."
cd backend

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please copy .env.example to .env and configure it"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d venv ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "Installing backend dependencies..."
pip install -r requirements.txt

# Run migrations
echo "Running database migrations..."
python add_email_verification_fields.py
python add_superuser_column.py
python add_missing_columns.py
python add_collections_slug.py
python add_transfer_tracking.py
python add_folders_column.py
python add_password_attempts.py
python add_2fa_columns.py
python add_redaction_fields.py
python add_blur_field.py
python add_allow_delete_field.py
python add_performance_indexes.py

# Create superuser
echo -e "\n👤 Create Superuser Account"
echo "Do you want to create a superuser account? (y/n)"
read -r create_super
if [ "$create_super" = "y" ]; then
    python create_superuser.py
fi

# Frontend deployment
echo -e "\n🎨 Deploying Frontend..."
cd ../frontend

# Install dependencies
echo "Installing frontend dependencies..."
npm install

# Build for production
echo "Building frontend for production..."
npm run build

echo -e "\n📝 Deployment Checklist:"
echo "========================"
echo "✅ Backend dependencies installed"
echo "✅ Database migrations completed"
echo "✅ Frontend built for production"

echo -e "\n⚙️  Additional Production Setup Required:"
echo "========================================"
echo "1. Configure your web server (Nginx/Apache) to:"
echo "   - Serve frontend build from frontend/dist"
echo "   - Proxy /api requests to backend (port 8000)"
echo ""
echo "2. Set up process manager for backend:"
echo "   - Install: pip install gunicorn"
echo "   - Run: gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000"
echo ""
echo "3. Configure SSL/TLS certificates (Let's Encrypt recommended)"
echo ""
echo "4. Set up monitoring:"
echo "   - Configure Sentry DSN in .env"
echo "   - Set up uptime monitoring"
echo ""
echo "5. Configure email service:"
echo "   - Add SendGrid API key to .env"
echo ""
echo "6. Configure payment processing:"
echo "   - Add Stripe keys to .env"
echo "   - Set up webhook endpoint"
echo ""
echo "7. Set up backup strategy for:"
echo "   - Database (SQLite file)"
echo "   - R2 storage bucket"
echo ""
echo "8. Security hardening:"
echo "   - Update CORS_ORIGINS in .env"
echo "   - Generate strong JWT_SECRET"
echo "   - Generate strong ENCRYPTION_MASTER_KEY"
echo "   - Enable virus scanning if needed"

echo -e "\n🚀 Deployment preparation complete!"
echo "Follow the additional setup steps above to complete production deployment."

# Create systemd service file template
cat > fileshare.service.example << 'EOF'
[Unit]
Description=FileShare API
After=network.target

[Service]
Type=exec
User=your_user
WorkingDirectory=/path/to/FileShare/backend
Environment="PATH=/path/to/FileShare/backend/venv/bin"
ExecStart=/path/to/FileShare/backend/venv/bin/gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

echo -e "\n📄 Systemd service template created: fileshare.service.example"
echo "Copy to /etc/systemd/system/fileshare.service and update paths"