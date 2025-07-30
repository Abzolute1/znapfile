#!/bin/bash
# Install Redis on Ubuntu/Debian

echo "Installing Redis..."
sudo apt update
sudo apt install -y redis-server

# Configure Redis to run as a service
sudo systemctl enable redis-server
sudo systemctl start redis-server

echo "Checking Redis status..."
sudo systemctl status redis-server --no-pager

echo "Testing Redis..."
redis-cli ping