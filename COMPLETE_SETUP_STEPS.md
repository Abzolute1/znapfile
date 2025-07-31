# 🚀 Complete Setup Steps for znapfile.com

## ✅ What's Done:
- DNS records added in Cloudflare (you confirmed)
- CNAME file in the repo
- Frontend built with correct API URL

## ⚠️ What You Need to Do:

### 1. Enable GitHub Pages (2 minutes)
1. Go to: https://github.com/Abzolute1/znapfile/settings/pages
2. Under "Source", select: **Deploy from a branch**
3. Branch: **main**
4. Folder: **/frontend/dist-github**
5. Click **Save**
6. Under "Custom domain", it should auto-detect: **znapfile.com**
7. Check **Enforce HTTPS**

### 2. Deploy the API Worker (3 minutes)

**Option A: Via Cloudflare Dashboard**
1. Go to: https://dash.cloudflare.com
2. Click **Workers & Pages** → **Create Application** → **Create Worker**
3. Name it: `znapfile-api`
4. Click **Deploy**
5. Click **Edit Code**
6. Delete all existing code
7. Copy ALL content from `backend/cloudflare-api-proxy.js`
8. Paste it in the editor
9. Click **Save and Deploy**
10. Go to **Settings** → **Triggers**
11. Add Custom Domain: **api.znapfile.com**

**Option B: Update your existing tunnel**
If you want to keep using the tunnel, just update the frontend to use:
```
VITE_API_URL=https://catch-pairs-bodies-confidence.trycloudflare.com/api/v1
```

## 🎯 Current Status:
- ✅ DNS is resolving correctly
- ⏳ GitHub Pages needs to be enabled
- ⏳ API worker needs deployment
- ✅ Frontend is ready

Once you complete these steps, https://znapfile.com will work perfectly!