#!/bin/bash

# ZnapFile Production Deployment Script

echo "🚀 ZnapFile Production Deployment"
echo "================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f "backend/.env" ]; then
    echo -e "${RED}❌ Error: backend/.env file not found!${NC}"
    echo "Please create backend/.env from backend/.env.example"
    exit 1
fi

if [ ! -f "frontend/.env" ]; then
    echo -e "${RED}❌ Error: frontend/.env file not found!${NC}"
    echo "Please create frontend/.env from frontend/.env.example"
    exit 1
fi

# Build Frontend
echo -e "\n${YELLOW}📦 Building Frontend...${NC}"
cd frontend
npm install
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend built successfully${NC}"
else
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi
cd ..

# Setup Backend
echo -e "\n${YELLOW}🔧 Setting up Backend...${NC}"
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install backend dependencies${NC}"
    exit 1
fi

# Run migrations
echo -e "\n${YELLOW}🗄️  Running database migrations...${NC}"
python simple_migration.py
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migrations completed${NC}"
else
    echo -e "${RED}❌ Migration failed${NC}"
    exit 1
fi

# Create necessary directories
mkdir -p logs
mkdir -p uploads

echo -e "\n${GREEN}🎉 Deployment preparation complete!${NC}"
echo -e "\nTo start the production server:"
echo -e "${YELLOW}cd backend && source venv/bin/activate${NC}"
echo -e "${YELLOW}gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000${NC}"
echo -e "\nDon't forget to:"
echo "1. Set up your web server (nginx) to serve frontend/dist"
echo "2. Configure reverse proxy for backend API"
echo "3. Set up SSL certificates (or use Cloudflare)"
echo "4. Configure cron jobs for cleanup tasks"