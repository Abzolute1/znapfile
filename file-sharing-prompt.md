# File Sharing Service - Complete Development Specification

## Project Overview
Build a modern file-sharing service similar to WeTransfer but with ultra-short expiry times and a focus on simplicity. The service allows users to drag-drop files and instantly get a shareable link. Files expire automatically after set durations.

## Core Principles
1. **DEAD SIMPLE**: The entire user journey should be 3 clicks maximum
2. **BLEEDING EDGE DESIGN**: Modern, animated, glass-morphism, dark mode by default
3. **SPEED**: Everything should feel instant - no loading screens if possible
4. **MOBILE FIRST**: Must work flawlessly on phones

## Technical Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Storage**: Cloudflare R2
- **Authentication**: JWT tokens
- **Background Jobs**: Celery with Redis for file expiry
- **Email**: SendGrid for transactional emails

### Frontend
- **Framework**: React 18+ with Vite
- **Routing**: React Router v6
- **State Management**: Zustand
- **Styling**: Tailwind CSS with custom animations
- **HTTP Client**: Axios with interceptors
- **File Upload**: react-dropzone
- **Animations**: Framer Motion
- **Icons**: Lucide React

## User Tiers & Limits

### Free Users (No Account Required)
- **File Size Limit**: 100 MB per file
- **Storage Limit**: 500 MB total active storage
- **Expiry Time**: 30 minutes (fixed, no options)
- **Concurrent Files**: Maximum 3 active files
- **Daily Upload Limit**: 10 files per IP address

### Free Account (Email Verified)
- **File Size Limit**: 500 MB per file
- **Storage Limit**: 1 GB total active storage
- **Expiry Options**: 30 minutes, 1 hour, 3 hours
- **Concurrent Files**: Maximum 5 active files
- **Daily Upload Limit**: 20 files

### Premium ($4.99/month)
- **File Size Limit**: 5 GB per file
- **Storage Limit**: 100 GB total active storage
- **Expiry Options**: 30 min to 7 days (custom)
- **Concurrent Files**: Unlimited
- **Features**: Password protection, download notifications, custom links

## Database Schema

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    tier VARCHAR(20) DEFAULT 'free',
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    stripe_customer_id VARCHAR(255),
    subscription_end_date TIMESTAMP
);

-- Files table
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    upload_ip VARCHAR(45),
    short_code VARCHAR(10) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    download_count INTEGER DEFAULT 0,
    max_downloads INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    deleted BOOLEAN DEFAULT FALSE
);

-- Share links table
CREATE TABLE share_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    custom_slug VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Download logs table
CREATE TABLE download_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    download_ip VARCHAR(45),
    user_agent TEXT,
    downloaded_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Public Endpoints
```
POST   /api/upload/anonymous     # Upload without account
GET    /api/download/{code}      # Download file
POST   /api/auth/register        # Create account
POST   /api/auth/login          # Login
POST   /api/auth/refresh        # Refresh JWT token
GET    /api/file/info/{code}    # Get file metadata (name, size, expiry)
```

### Authenticated Endpoints
```
POST   /api/upload              # Upload with account
GET    /api/files               # List user's active files
DELETE /api/files/{id}          # Delete file immediately
PATCH  /api/files/{id}          # Update expiry, password
GET    /api/account             # Get account info
PATCH  /api/account             # Update account
POST   /api/subscription        # Create Stripe subscription
DELETE /api/subscription        # Cancel subscription
```

## Frontend Pages & Components

### 1. Landing Page (/)
```jsx
// Hero Section
- Massive drop zone (80% of viewport)
- Animated gradient background (purple to blue)
- Glass-morphism effect on drop area
- "Drop files here or click to browse" text
- File type icons floating animation
- Real-time upload counter: "2.3M files shared and counting"

// Features Section (below fold)
- 3 cards with icons:
  - "Lightning Fast" - expires in 30 minutes
  - "Dead Simple" - no signup required  
  - "Ultra Secure" - files auto-delete

// Pricing Section
- Free vs Premium comparison table
- Emphasis on premium 100GB storage
```

### 2. Upload Flow (No Page Change)
```jsx
// When file dropped:
1. Smooth transition: drop zone shrinks to top
2. Upload progress bar with speed indicator
3. File preview with icon based on type
4. Real-time percentage counter
5. Cancel button

// After upload:
1. Success animation (confetti or pulse)
2. Big copy button with link
3. QR code for mobile sharing
4. "Expires in: 29:47" countdown timer
5. Share buttons (WhatsApp, Email, etc)
```

### 3. Download Page (/d/{code})
```jsx
// Clean, centered design:
- File icon (based on type)
- Filename and size
- "Expires in X minutes" with live countdown
- Big download button with hover effect
- Password input if protected (slides in smoothly)
- Download count if visible
```

### 4. Dashboard (/dashboard) - Logged in users only
```jsx
// Modern dashboard:
- Storage usage ring chart (animated)
- Active files grid with:
  - Preview thumbnails
  - Download count badges
  - Time remaining progress bars
  - Quick actions (copy link, delete)
- Recent activity timeline
- Quick upload FAB (floating action button)
```

### 5. Auth Pages (/login, /register)
```jsx
// Split screen design:
- Left: Animated illustration/graphics
- Right: Minimal form
  - Social login buttons (Google, GitHub)
  - "Or continue with email" divider
  - Email/password inputs with floating labels
  - Smooth transitions between login/register
```

## Design System

### Colors
```css
:root {
  --primary: #8B5CF6;      /* Purple */
  --secondary: #3B82F6;    /* Blue */
  --accent: #10B981;       /* Green */
  --dark-bg: #0F172A;      /* Deep blue-black */
  --card-bg: #1E293B;      /* Lighter blue-black */
  --text: #F1F5F9;         /* Off-white */
  --text-muted: #94A3B8;   /* Gray */
  --error: #EF4444;        /* Red */
}
```

### Components Style Guide
- **Cards**: Dark background with subtle border, blur backdrop
- **Buttons**: Gradient backgrounds with hover glow effect
- **Inputs**: Transparent with bottom border, focus brings glow
- **Animations**: Smooth, 300-400ms, ease-out timing
- **Shadows**: Colored shadows matching element color
- **Loading**: Skeleton screens, no spinners

### Typography
```css
/* Headlines: Inter or Geist */
/* Body: System font stack for performance */
/* Monospace: JetBrains Mono for codes/links */
```

## File Handling

### Upload Process
1. Client-side validation (size, type)
2. Generate unique filename: `{timestamp}_{random}_{hash}`
3. Direct upload to Cloudflare R2 using presigned URL
4. Store metadata in PostgreSQL
5. Return short shareable code

### Download Process
1. Validate link hasn't expired
2. Check password if protected
3. Generate Cloudflare R2 presigned URL (1 hour expiry)
4. Increment download counter
5. Log download for analytics
6. Stream file to user

### Automatic Cleanup
- Celery task runs every 5 minutes
- Queries files where `expires_at < NOW()`
- Deletes from R2 first, then database
- Sends webhook if configured (premium feature)

## Security Requirements

### General
- All passwords hashed with bcrypt
- JWT tokens expire in 1 hour (refresh token 30 days)
- Rate limiting on all endpoints
- CORS properly configured
- File type validation (no executables)
- Virus scanning for files > 10MB (ClamAV)

### Upload Security
- Validate MIME types
- Check file headers (not just extension)
- Sanitize filenames
- Generate unguessable short codes (10 chars)
- Store files with UUID names

### Download Security  
- No directory listing
- Time-limited presigned URLs
- IP-based rate limiting
- Optional password protection
- No caching headers for sensitive content

## Performance Optimizations

### Frontend
- Lazy load all routes
- Image optimization (WebP with fallbacks)
- Preload critical fonts
- Service worker for offline detection
- Debounced API calls
- Virtual scrolling for file lists

### Backend
- Database connection pooling
- Redis caching for file metadata
- Cloudflare CDN for static assets
- Gzip compression
- Async everything
- Database indexes on short_code, expires_at

## Error Handling

### User-Friendly Messages
- "Oops! This file has expired" (not 404)
- "File too large for your plan" (with upgrade prompt)
- "Too many uploads today" (with countdown)
- "Network hiccup" (with retry button)

### Frontend Error Boundaries
- Catch React errors gracefully
- Show beautiful error pages
- Auto-report to Sentry (but no user data)
- Offer refresh/home buttons

## Mobile Optimizations
- Touch-friendly hit targets (44px minimum)
- Swipe to delete files
- Pull to refresh on dashboard
- Bottom sheet modals
- Haptic feedback on actions
- Share sheet integration

## Analytics & Monitoring
- Mixpanel for user events
- Sentry for error tracking
- CloudWatch for infrastructure
- Custom dashboard for admin:
  - Active users
  - Storage usage
  - Upload/download stats
  - Revenue metrics

## Environment Variables
```bash
# Backend
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
R2_ACCESS_KEY=...
R2_SECRET_KEY=...
R2_BUCKET=...
R2_ENDPOINT=...
JWT_SECRET=...
SENDGRID_API_KEY=...
STRIPE_SECRET_KEY=...
SENTRY_DSN=...

# Frontend
VITE_API_URL=...
VITE_STRIPE_PUBLIC_KEY=...
VITE_MIXPANEL_TOKEN=...
VITE_SENTRY_DSN=...
```

## Launch Checklist
- [ ] Terms of Service and Privacy Policy
- [ ] GDPR compliance (cookie banner, data export)
- [ ] Abuse detection system
- [ ] Admin panel for monitoring
- [ ] Backup strategy for database
- [ ] DDoS protection (Cloudflare)
- [ ] SEO optimization
- [ ] Open Graph tags for social sharing
- [ ] PWA manifest for mobile install
- [ ] A/B testing framework

## Future Features (Post-Launch)
- Email-to-upload addresses
- Slack/Discord integrations  
- API for developers
- Branded download pages (enterprise)
- Bulk upload/download
- File preview (images, PDFs)
- Comments on shared files
- Analytics for shared links

---

## Implementation Notes

1. **Start with core upload/download flow** - Everything else is secondary
2. **Mobile experience is not optional** - Test on real devices constantly  
3. **Speed perception > actual speed** - Use optimistic UI updates
4. **Delete aggressively** - Storage costs kill. Enforce expiry times strictly
5. **Premium features must feel premium** - Password protection should have smooth UI
6. **Onboarding is critical** - First upload must be magical
7. **Copy is UX** - "Your file will self-destruct in 30 minutes" is better than "Expires: 30m"

Remember: WeTransfer is complicated. You're building the opposite. Every feature should be questioned: "Does this make it simpler?"