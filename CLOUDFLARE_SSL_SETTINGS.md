# 🔒 Force HTTPS on Cloudflare

## Go to Cloudflare Dashboard:

1. **SSL/TLS → Overview**
   - Set SSL mode to: **Full (strict)**

2. **SSL/TLS → Edge Certificates**
   - Enable: **Always Use HTTPS** ✅
   - Enable: **Automatic HTTPS Rewrites** ✅

3. **Rules → Page Rules** (or Configuration Rules)
   - Create rule:
   - URL: `http://*znapfile.com/*`
   - Setting: **Always Use HTTPS**

This will force ALL traffic to use HTTPS automatically!