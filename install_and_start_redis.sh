#!/bin/bash
# Complete Redis installation and setup script

echo "==================================="
echo "Redis Installation Script"
echo "==================================="

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then 
    echo "This script needs sudo privileges."
    echo "Please run: sudo bash install_and_start_redis.sh"
    exit 1
fi

echo "1. Updating package list..."
apt update

echo -e "\n2. Installing Redis..."
apt install -y redis-server

echo -e "\n3. Configuring Redis..."
# Enable Redis to start on boot
systemctl enable redis-server

# Start Redis
echo -e "\n4. Starting Redis..."
systemctl start redis-server

# Check status
echo -e "\n5. Checking Redis status..."
if systemctl is-active --quiet redis-server; then
    echo "✅ Redis is running!"
    
    # Test Redis
    echo -e "\n6. Testing Redis connection..."
    if redis-cli ping | grep -q "PONG"; then
        echo "✅ Redis is responding correctly!"
        echo -e "\n🎉 Redis installation complete!"
        echo "Redis is running at: redis://localhost:6379"
    else
        echo "❌ Redis is running but not responding to ping"
    fi
else
    echo "❌ Failed to start Redis"
    systemctl status redis-server
fi

echo -e "\n==================================="
echo "Installation complete!"
echo "==================================="