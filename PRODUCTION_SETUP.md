# FileShare Production Setup Guide

## 🚀 Quick Start

1. Clone the repository
2. Copy environment variables: `cp backend/.env.example backend/.env`
3. Configure all required environment variables in `backend/.env`
4. Run deployment script: `./deploy_production.sh`

## 📋 Prerequisites

- Python 3.11+
- Node.js 18+
- Redis (for rate limiting)
- SQLite 3
- Nginx or Apache (for reverse proxy)

## 🔧 Environment Configuration

### Required Services

1. **Cloudflare R2 Storage**
   - Create a bucket
   - Generate API credentials
   - Update R2_* variables in .env

2. **SendGrid Email Service**
   - Create account and verify sender
   - Generate API key
   - Update SENDGRID_API_KEY in .env

3. **Stripe Payment Processing**
   - Create account and products
   - Get API keys and price IDs
   - Update STRIPE_* variables in .env

4. **Sentry Error Tracking** (Optional)
   - Create project
   - Get DSN
   - Update SENTRY_DSN in .env

### Security Configuration

1. **Generate Strong Secrets**
   ```bash
   # Generate JWT secret
   openssl rand -hex 32
   
   # Generate encryption key
   openssl rand -hex 32
   ```

2. **Update CORS Origins**
   - Set CORS_ORIGINS to your domain(s)
   - Remove localhost entries

3. **Configure Trusted Hosts**
   - Backend automatically validates hosts in production

## 🖥️ Server Setup

### Nginx Configuration Example

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        root /path/to/FileShare/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Large file uploads
        client_max_body_size 5G;
        proxy_request_buffering off;
        proxy_buffering off;
    }
}
```

### Process Management (systemd)

1. Copy service file:
   ```bash
   sudo cp fileshare.service.example /etc/systemd/system/fileshare.service
   ```

2. Edit and update paths in the service file

3. Enable and start service:
   ```bash
   sudo systemctl enable fileshare
   sudo systemctl start fileshare
   ```

### Database Backup

Create a cron job for regular backups:

```bash
# Add to crontab
0 2 * * * sqlite3 /path/to/fileshare.db ".backup /path/to/backups/fileshare-$(date +\%Y\%m\%d).db"
```

## 📊 Monitoring

### Health Check Endpoint
- GET `/` - Returns API status

### Recommended Monitoring
- Uptime monitoring (UptimeRobot, Pingdom)
- Error tracking (Sentry)
- Performance monitoring (New Relic, DataDog)
- Log aggregation (ELK stack, Papertrail)

## 🔒 Security Checklist

- [ ] Strong JWT_SECRET configured
- [ ] Strong ENCRYPTION_MASTER_KEY configured
- [ ] CORS_ORIGINS updated for production domain
- [ ] SSL/TLS certificate installed
- [ ] Firewall configured (allow 80, 443, 22)
- [ ] Redis password configured (if exposed)
- [ ] Database file permissions restricted
- [ ] Regular security updates scheduled

## 🚨 Troubleshooting

### Common Issues

1. **Rate limiting not working**
   - Ensure Redis is running
   - Check REDIS_URL in .env

2. **File uploads failing**
   - Check client_max_body_size in Nginx
   - Verify R2 credentials and bucket permissions

3. **Email not sending**
   - Verify SendGrid API key
   - Check sender verification status

4. **Payment webhooks failing**
   - Ensure webhook endpoint is accessible
   - Verify webhook secret matches Stripe dashboard

## 📈 Scaling Considerations

1. **Database**: Consider PostgreSQL for better concurrency
2. **Storage**: R2 automatically scales
3. **Backend**: Add more Gunicorn workers or use container orchestration
4. **Caching**: Implement Redis caching for frequently accessed data

## 🔄 Update Process

1. Backup database
2. Pull latest code
3. Run migrations
4. Update dependencies
5. Rebuild frontend
6. Restart services

```bash
# Update script
cd /path/to/FileShare
git pull
cd backend
source venv/bin/activate
pip install -r requirements.txt
# Run any new migrations
cd ../frontend
npm install
npm run build
sudo systemctl restart fileshare
```

## 📞 Support

For production issues:
1. Check Sentry for errors
2. Review application logs
3. Check system resources (CPU, memory, disk)
4. Verify all external services are operational

## 🎉 Launch Checklist

- [ ] All environment variables configured
- [ ] Database migrations completed
- [ ] Superuser account created
- [ ] SSL certificate installed
- [ ] Email service verified
- [ ] Payment processing tested
- [ ] Monitoring configured
- [ ] Backups scheduled
- [ ] Security hardening completed
- [ ] Performance testing done

Once all items are checked, your FileShare instance is ready for production! 🚀