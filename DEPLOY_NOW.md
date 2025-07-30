# 🚀 Deploy ZnapFile to znapfile.com in 2 Minutes

## Your app is already running at:
- Frontend: https://mental-hired-lc-ou.trycloudflare.com
- Backend: https://catch-pairs-bodies-confidence.trycloudflare.com

## To make it permanent at znapfile.com:

### Option 1: GitHub + Cloudflare Pages (EASIEST)
1. Open: https://github.com/Abzolute1/znapfile/tree/main/frontend
2. Click the "." key on your keyboard (opens github.dev editor)
3. Create file: `_redirects` with content:
   ```
   /api/* https://catch-pairs-bodies-confidence.trycloudflare.com/api/:splat 200
   ```
4. Commit the file
5. Go to Cloudflare → Workers & Pages → Create → Pages
6. Import your repo and it auto-deploys!

### Option 2: Direct GitHub Pages
1. Go to: https://github.com/Abzolute1/znapfile/settings/pages
2. Source: Deploy from branch
3. Branch: main
4. Folder: /frontend/dist
5. Save

### Option 3: Keep Current Setup
Your app works RIGHT NOW! The URLs above are live. Just share those links!

## Backend Deployment (Later)
When the tunnel URLs expire, deploy backend to:
- render.com (free)
- railway.app ($5 credit)
- fly.io (generous free tier)

Then update frontend's API URL.