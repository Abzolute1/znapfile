# Znapfile - Enterprise File Transfer Platform

Professional-grade file sharing solution with military-level encryption, enterprise features, and a stunning UI. Built for businesses that demand security, reliability, and performance.

## Features

- **Dead Simple**: 3-click file sharing process
- **Secure**: Files auto-expire, password protection, encrypted storage
- **Fast**: Direct uploads to Cloudflare R2
- **Mobile First**: Responsive design that works on all devices
- **User Tiers**: Free (no signup), Free Account, and Premium options

## Security Features

- File type validation (MIME type, magic bytes, extension checking)
- Rate limiting on all endpoints
- Password protection for files
- Automatic file expiration
- Secure file naming (prevents enumeration)
- XSS and CSRF protection
- SQL injection prevention
- Security headers on all responses

## Tech Stack

### Backend
- FastAPI (Python)
- PostgreSQL with SQLAlchemy
- Cloudflare R2 for storage
- Redis for caching and rate limiting
- Celery for background tasks
- JWT authentication

### Frontend
- React 18 with Vite
- Tailwind CSS
- React Router v6
- Zustand for state management
- Axios for API calls
- Framer Motion for animations

## Quick Start

1. Clone the repository:
```bash
git clone <repository-url>
cd FileShare
```

2. Create a `.env` file in the root directory:
```env
R2_ACCESS_KEY=your_cloudflare_r2_access_key
R2_SECRET_KEY=your_cloudflare_r2_secret_key
R2_BUCKET=your_bucket_name
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
```

3. Start the services with Docker Compose:
```bash
docker-compose up
```

4. Access the application:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000

## Development Setup

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Database Setup
```bash
# Run PostgreSQL and Redis
docker-compose up postgres redis

# Run migrations (from backend directory)
alembic upgrade head
```

## API Documentation

When running in development mode, API documentation is available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## User Tiers

### Free (No Account)
- 100 MB per file
- 500 MB total storage
- 30-minute expiry only
- 3 concurrent files
- 10 uploads per day

### Free Account
- 500 MB per file
- 1 GB total storage
- 30 min, 1 hour, 3 hour expiry options
- 5 concurrent files
- 20 uploads per day

### Premium ($4.99/month)
- 5 GB per file
- 100 GB total storage
- Custom expiry (30 min to 7 days)
- Unlimited concurrent files
- Password protection
- Download notifications

## Environment Variables

### Backend
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `R2_ACCESS_KEY`: Cloudflare R2 access key
- `R2_SECRET_KEY`: Cloudflare R2 secret key
- `R2_BUCKET`: R2 bucket name
- `R2_ENDPOINT`: R2 endpoint URL
- `JWT_SECRET`: Secret key for JWT tokens
- `SENDGRID_API_KEY`: SendGrid API key for emails
- `STRIPE_SECRET_KEY`: Stripe secret key for payments
- `SENTRY_DSN`: Sentry DSN for error tracking

### Frontend
- `VITE_API_URL`: Backend API URL
- `VITE_STRIPE_PUBLIC_KEY`: Stripe publishable key

## Security Best Practices

1. **Always use HTTPS in production**
2. **Change all default passwords and secrets**
3. **Enable Cloudflare WAF rules**
4. **Regular security audits**
5. **Monitor rate limit violations**
6. **Enable virus scanning for files > 10MB**

## Deployment

### Production Checklist
- [ ] Set strong JWT_SECRET (use `openssl rand -hex 32`)
- [ ] Configure proper CORS origins
- [ ] Enable HTTPS
- [ ] Set up Cloudflare WAF
- [ ] Configure Sentry for error tracking
- [ ] Set up monitoring and alerts
- [ ] Enable automatic backups
- [ ] Configure email service
- [ ] Set up Stripe for payments

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[Your License Here]

## Support

For issues and feature requests, please use the GitHub issue tracker.