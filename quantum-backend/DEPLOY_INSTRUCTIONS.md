# 🚀 Deploy Quantum Backend Instructions

Since I can't access your browser, here's how to deploy each service:

## 1. Deno Deploy (Easiest - No CLI needed!)

1. Go to https://dash.deno.com
2. Click "New Project" 
3. Select "Deploy from GitHub"
4. Choose your repo: `alexmaras/FileShare`
5. Set entry point: `quantum-backend/deno/main.ts`
6. Click "Deploy"
7. Your backend will be at: `https://[project-name].deno.dev`

## 2. Vercel

1. Go to https://vercel.com
2. Click "Add New Project"
3. Import your GitHub repo
4. Set root directory to: `quantum-backend/vercel`
5. Click "Deploy"
6. Your backend will be at: `https://znapfile.vercel.app`

## 3. Netlify

1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Choose GitHub and select your repo
4. Set base directory to: `quantum-backend/netlify`
5. Click "Deploy"
6. Your backend will be at: `https://znapfile.netlify.app`

## 4. Cloudflare Worker

1. Go to https://dash.cloudflare.com
2. Go to Workers & Pages
3. Create a new Worker
4. Name it: `znapfile-quantum-router`
5. Click "Quick edit"
6. Copy the contents of `quantum-backend/cloudflare/worker.js`
7. Save and deploy

## 5. Update Frontend

Once deployed, update the backend URLs in the Cloudflare Worker!

## That's it! Your backend is now immortal and costs $0/month! 🎉