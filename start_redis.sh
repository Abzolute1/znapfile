#!/bin/bash
# Start Redis for development

echo "Starting Redis for FileShare..."

# Check if Redis is installed
if ! command -v redis-server &> /dev/null; then
    echo "Redis is not installed. Please install Redis first:"
    echo "  sudo apt update"
    echo "  sudo apt install -y redis-server"
    exit 1
fi

# Check if Redis is already running
if redis-cli ping &> /dev/null; then
    echo "✅ Redis is already running"
else
    echo "Starting Redis..."
    redis-server --daemonize yes
    sleep 2
    
    if redis-cli ping &> /dev/null; then
        echo "✅ Redis started successfully"
    else
        echo "❌ Failed to start Redis"
        exit 1
    fi
fi

echo "Redis is ready at redis://localhost:6379"