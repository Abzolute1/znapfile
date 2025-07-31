# 🚀 ZNAPFILE.COM DNS CONFIGURATION

## Add these DNS records in Cloudflare:

### 1. Frontend (GitHub Pages)
- **Type:** CNAME
- **Name:** @ (or znapfile.com)
- **Target:** alexmaras.github.io
- **Proxy:** OFF (DNS only)

### 2. WWW redirect
- **Type:** CNAME
- **Name:** www
- **Target:** alexmaras.github.io
- **Proxy:** OFF (DNS only)

### 3. API Backend (Cloudflare Worker)
- **Type:** CNAME
- **Name:** api
- **Target:** catch-pairs-bodies-confidence.trycloudflare.com
- **Proxy:** ON (Proxied)

## GitHub Pages Setup:

1. Go to: https://github.com/Abzolute1/znapfile/settings/pages
2. Add custom domain: znapfile.com
3. Wait for DNS check (few minutes)
4. Enable "Enforce HTTPS"

## What this does:
- znapfile.com → Your frontend on GitHub Pages (HTTPS)
- api.znapfile.com → Your backend via Cloudflare
- Everything runs with proper HTTPS!