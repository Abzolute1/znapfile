#!/bin/bash

echo "🌌 Deploying Quantum Backend..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Deploy to Deno Deploy
echo -e "${BLUE}Deploying to Deno Deploy...${NC}"
cd deno
# Create deployctl config if not exists
if ! command -v deployctl &> /dev/null; then
    echo "Installing Deno Deploy CLI..."
    deno install -Arf https://deno.land/x/deploy/deployctl.ts
fi

# Deploy to Deno
deployctl deploy --project=znapfile --prod main.ts || {
    echo -e "${YELLOW}Deno Deploy requires manual setup at https://dash.deno.com${NC}"
}
cd ..

# Deploy to Vercel
echo -e "${BLUE}Deploying to Vercel...${NC}"
cd vercel
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm i -g vercel
fi
vercel --prod --yes || {
    echo -e "${YELLOW}Run 'vercel' in quantum-backend/vercel to deploy${NC}"
}
cd ..

# Deploy to Netlify
echo -e "${BLUE}Deploying to Netlify...${NC}"
cd netlify
if ! command -v netlify &> /dev/null; then
    echo "Installing Netlify CLI..."
    npm i -g netlify-cli
fi
netlify deploy --prod || {
    echo -e "${YELLOW}Run 'netlify init' then 'netlify deploy --prod' in quantum-backend/netlify${NC}"
}
cd ..

# Deploy Cloudflare Worker
echo -e "${BLUE}Deploying Cloudflare Worker...${NC}"
cd cloudflare
if ! command -v wrangler &> /dev/null; then
    echo "Installing Wrangler CLI..."
    npm i -g wrangler
fi
wrangler deploy || {
    echo -e "${YELLOW}Run 'wrangler login' then 'wrangler deploy' in quantum-backend/cloudflare${NC}"
}
cd ..

echo -e "${GREEN}✨ Quantum Backend deployment initiated!${NC}"
echo -e "${GREEN}Services will be available at:${NC}"
echo "  • Deno: https://znapfile.deno.dev"
echo "  • Vercel: https://znapfile.vercel.app"
echo "  • Netlify: https://znapfile.netlify.app"
echo "  • Router: https://api.znapfile.com (via Cloudflare)"