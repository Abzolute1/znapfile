#!/bin/bash
# Auto-update script for ZnapFile
echo "🔄 Checking for updates..."
git pull origin main
cd frontend && npm install && npm run build
echo "✅ Update complete!"
