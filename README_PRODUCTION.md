# ZnapFile - Production Ready File Sharing Platform

## 🚀 What's Included

- **File Sharing**: Upload files with expiry dates, password protection, and download limits
- **Collections**: Organize files into shareable collections with folder structure
- **Billing**: Integrated Stripe subscriptions (Free, Pro $9.99, Max $24.99)
- **Storage**: Cloudflare R2 with FREE egress (no bandwidth costs!)
- **Security**: File encryption, JWT auth, password protection

## 📁 Project Structure

```
FileShare/
├── frontend/          # React + Vite frontend
│   ├── src/          # Source code
│   ├── dist/         # Production build (after npm run build)
│   └── package.json
├── backend/          # FastAPI backend
│   ├── app/          # Application code
│   ├── migrations/   # Database migrations
│   ├── requirements.txt
│   └── .env         # Environment variables (create this)
├── dev-scripts/      # Development utilities (not for production)
└── PRODUCTION_CHECKLIST.md

```

## 🔑 Required Services

1. **Cloudflare R2** - Object storage (FREE egress!)
2. **Stripe** - Payment processing
3. **Domain** - Your custom domain
4. **Hosting** - Any VPS/Cloud provider

## 💾 Database

- Uses SQLite (simple, reliable, perfect for this use case)
- Auto-creates `fileshare.db` on first run
- Run `python simple_migration.py` for updates

## 🎯 Key Features by Plan

**Free Plan**
- 1GB file size limit
- 2GB monthly transfer
- 24-hour file expiry
- 5 transfers/day

**Pro Plan ($9.99/month)**
- 10GB file size limit  
- 300GB monthly transfer
- 7-day max expiry
- Unlimited transfers

**Max Plan ($24.99/month)**
- 50GB file size limit
- 1TB monthly transfer
- 20-day max expiry
- Unlimited transfers

## 🛡️ Security Features

- All files encrypted at rest
- JWT authentication
- Password protection for files/collections
- Rate limiting
- CORS protection
- Abuse prevention system

## 📊 No Hidden Costs

- Cloudflare R2 = FREE egress (downloads)
- Only pay for storage (~$0.015/GB/month)
- No bandwidth charges!

## 🚦 Quick Start

1. Clone the repository
2. Set up environment variables (see PRODUCTION_CHECKLIST.md)
3. Build frontend: `cd frontend && npm install && npm run build`
4. Install backend: `cd backend && pip install -r requirements.txt`
5. Run migrations: `python simple_migration.py`
6. Start server: `gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker`

## 📝 Support

- Database backups: Run daily via cron
- Logs: Check `backend.log` for issues
- Monitoring: Use `tail -f backend.log`

## ✅ Production Ready

This codebase is clean, tested, and ready for deployment. All test files have been removed, environment variables are properly configured, and the architecture is optimized for production use.