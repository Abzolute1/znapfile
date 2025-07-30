# ZnapFile Production Deployment Checklist

## ✅ Required Environment Variables

Create a `.env` file in the backend directory with these required values:

```bash
# Database
DATABASE_URL=sqlite+aiosqlite:///./fileshare.db

# Cloudflare R2 Storage (REQUIRED)
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_ACCESS_KEY_ID=your_access_key_here
CLOUDFLARE_SECRET_ACCESS_KEY=your_secret_key_here
CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name_here

# Security (REQUIRED)
SECRET_KEY=generate_a_32_char_random_string_here

# Stripe Payment Processing (REQUIRED)
STRIPE_SECRET_KEY=sk_live_your_key_here
STRIPE_PRO_PRICE_ID=price_your_pro_price_id
STRIPE_MAX_PRICE_ID=price_your_max_price_id
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# File Encryption (REQUIRED)
ENCRYPTION_MASTER_KEY=generate_another_32_char_key_here

# CORS Configuration (REQUIRED)
CORS_ORIGINS=["https://yourdomain.com","https://www.yourdomain.com"]

# Environment (REQUIRED)
DEBUG=false
ENVIRONMENT=production
FRONTEND_URL=https://yourdomain.com
```

## 🚀 Deployment Steps

1. **Database Setup**
   ```bash
   cd backend
   # Run migrations
   python simple_migration.py
   ```

2. **Frontend Build**
   ```bash
   cd frontend
   npm run build
   # Deploy dist/ folder to your hosting
   ```

3. **Backend Deployment**
   ```bash
   cd backend
   # Install dependencies
   pip install -r requirements.txt
   
   # Run with production server
   gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
   ```

4. **Set Up Cron Jobs**
   ```bash
   # Add to crontab:
   0 * * * * cd /path/to/backend && python cleanup_expired_collections.py
   0 0 * * * cd /path/to/backend && python cleanup_expired_files.py
   ```

5. **Cloudflare Configuration**
   - Point your domain to Cloudflare
   - SSL/TLS will be handled automatically
   - Configure Page Rules if needed

## 🔒 Security Checklist

- [ ] Generate strong SECRET_KEY (32+ characters)
- [ ] Generate strong ENCRYPTION_MASTER_KEY (32 characters)
- [ ] Set DEBUG=false
- [ ] Update CORS_ORIGINS with your actual domain
- [ ] Verify Stripe webhook endpoint is accessible
- [ ] Ensure database file has proper permissions

## 📊 Stripe Configuration

1. Create products in Stripe Dashboard:
   - Pro Plan: $6.99/month
   - Max Plan: $21.99/month

2. Get the price IDs from Stripe Dashboard

3. Set up webhook endpoint:
   - URL: `https://yourdomain.com/api/v1/subscriptions/stripe-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.*`

## 🧪 Post-Deployment Testing

1. **File Operations**
   - [ ] Upload a file (test each plan limit)
   - [ ] Download a file
   - [ ] Delete a file
   - [ ] Test password protection

2. **Collections**
   - [ ] Create a collection
   - [ ] Add files to collection
   - [ ] Share collection link
   - [ ] Test collection expiry

3. **Billing**
   - [ ] Test free plan limits
   - [ ] Test upgrade flow
   - [ ] Verify Stripe webhook works

## 📝 Notes

- R2 has FREE egress - no bandwidth costs!
- SQLite database - backup regularly
- File encryption keys must never change after deployment
- Collections expire automatically via cron job