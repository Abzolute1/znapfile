# 🚀 Deploy API Worker to Cloudflare

## Quick Steps:

1. **Create a Cloudflare Worker:**
   - Go to: https://dash.cloudflare.com/workers
   - Click "Create a Worker"
   - Name it: `znapfile-api`

2. **Copy the code:**
   - Copy ALL content from `backend/cloudflare-api-proxy.js`
   - Paste into the worker editor
   - Click "Save and Deploy"

3. **Add custom domain:**
   - In worker settings, go to "Triggers"
   - Add route: `api.znapfile.com/*`
   - Zone: znapfile.com

## Alternative: Use Wrangler CLI

```bash
# Install wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create wrangler.toml
cat > wrangler.toml << EOF
name = "znapfile-api"
main = "backend/cloudflare-api-proxy.js"
compatibility_date = "2023-05-18"

[env.production]
workers_dev = false
route = { pattern = "api.znapfile.com/*", zone_name = "znapfile.com" }
EOF

# Deploy
wrangler publish
```

That's it! Your API will be available at https://api.znapfile.com