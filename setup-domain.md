# Setting up znapfile.com

## Option 1: Quick Setup with Cloudflare (Your domain + permanent hosting)

1. **Add your domain to Cloudflare**
   - Go to https://dash.cloudflare.com
   - Add Site → Enter "znapfile.com"
   - Cloudflare will give you nameservers
   - Update nameservers at your domain registrar

2. **Deploy Frontend to Cloudflare Pages**
   ```bash
   npm install -g wrangler
   cd frontend
   wrangler pages publish dist --project-name=znapfile
   ```
   - This gives you: znapfile.pages.dev
   - Then add custom domain in Cloudflare Pages settings

3. **Deploy Backend to Railway/Render**
   - Get a permanent URL like: znapfile-backend.up.railway.app
   - Update frontend to use this API URL

4. **Set DNS Records in Cloudflare**
   - A record: znapfile.com → Your Cloudflare Pages
   - CNAME: www → znapfile.com
   - CNAME: api → your-backend-url (optional)

## Option 2: Keep using your PC (temporary)

You can't use custom domains with free Cloudflare tunnels. You'd need:
- Cloudflare Zero Trust (paid)
- Or use ngrok with custom domains (paid)
- Or set up your own reverse proxy

## Option 3: Full Cloudflare Setup (Best for production)

1. Frontend on Cloudflare Pages (FREE)
2. Backend on Cloudflare Workers (FREE tier available)
3. Your domain managed by Cloudflare (FREE)
4. Result: Everything at znapfile.com

Want me to help you deploy this properly so it runs at znapfile.com 24/7?