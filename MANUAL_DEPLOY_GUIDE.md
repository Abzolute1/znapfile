# 🚀 Manual Deployment Guide for Immortal Hosting

Since we need Node.js v20+ for Wrangler, here's how to manually deploy the immortal infrastructure:

## 1. Cloudflare Worker Gateway

1. Go to https://workers.cloudflare.com
2. Click "Create a Service"
3. Name it: `znapfile-gateway`
4. Copy the contents of `backend/workers/cloudflare-gateway.js`
5. Paste into the worker editor
6. Click "Save and Deploy"

## 2. Deno Deploy

1. Go to https://deno.com/deploy
2. Click "New Project"
3. Connect your GitHub repo
4. Select `backend/serverless/deno-deploy.ts` as entry point
5. Deploy

## 3. Netlify Functions

The deployment script already created `netlify.toml`. Just:
1. Go to https://app.netlify.com
2. Connect your GitHub repo
3. It will auto-detect the config

## 4. Vercel Edge Functions  

The deployment script created `vercel.json`. Just:
1. Go to https://vercel.com
2. Import your GitHub repo
3. Deploy

## 5. GitHub Actions

The workflow was created at `.github/workflows/eternal-compute.yml`
It will run automatically every 30 minutes to maintain the quantum network.

## 6. Connect Everything

Update your DNS on Cloudflare:
- CNAME record: `@` -> `znapfile.pages.dev` (for GitHub Pages)
- CNAME record: `api` -> `znapfile-gateway.workers.dev` (for API)

## Current Active Services:

✅ GitHub Pages: https://alexmaras.github.io/FileShare/
✅ Cloudflare Tunnel: https://catch-pairs-bodies-confidence.trycloudflare.com
✅ Local Backend: Running on port 8000

## Next Steps:

1. Deploy the Cloudflare Worker manually
2. Set up Deno Deploy
3. The P2P network will activate automatically when users visit the site

Your app is already accessible at the GitHub Pages URL!