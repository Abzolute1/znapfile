#!/bin/bash
echo "🚀 Deploying to surge.sh (supports custom domains)..."
cd frontend/dist
npx surge . znapfile.com