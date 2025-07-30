#!/bin/bash

echo "🚀 Starting ZnapFile locally..."
echo "==============================="

# Check if virtual environment exists
if [ ! -d "backend/venv" ]; then
    echo "Creating Python virtual environment..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
else
    echo "Activating existing virtual environment..."
    source backend/venv/bin/activate
fi

# Create .env file if it doesn't exist
if [ ! -f "backend/.env" ]; then
    echo "Creating .env file..."
    cat > backend/.env << EOF
DATABASE_URL=sqlite:///./fileshare.db
SECRET_KEY=$(openssl rand -hex 32)
ENCRYPTION_MASTER_KEY=$(openssl rand -hex 32)
JWT_SECRET_KEY=$(openssl rand -hex 32)
CLOUDFLARE_ACCOUNT_ID=771e467bc26f111ecfa799d97da1d2ea
CLOUDFLARE_ACCESS_KEY_ID=23c6f2465ed57fdbd543bfc63f87d527
CLOUDFLARE_SECRET_ACCESS_KEY=a846139eb282b73f862f5cb0be16b3124de64181100186e89e69d061243c9105
CLOUDFLARE_R2_BUCKET_NAME=znapfile-production
STRIPE_API_KEY=your_stripe_key_here
STRIPE_WEBHOOK_SECRET=your_webhook_secret_here
EOF
    echo "✅ Created .env file - Please update STRIPE keys!"
fi

# Start backend
echo "Starting backend server..."
cd backend
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Start frontend
echo "Starting frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ ZnapFile is running!"
echo "========================"
echo "Frontend: http://localhost:5173"
echo "Backend: http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait