# Complete Security Implementation Guide

## Critical Security Notice
This document contains MANDATORY security implementations. Every item must be implemented to prevent data breaches, financial loss, and legal liability. Missing even one could result in catastrophic failure.

## Backend Security Implementation

### 1. File Upload Security

```python
# REQUIRED: File validation class
class FileValidator:
    # Malicious file extensions - MUST block
    BLOCKED_EXTENSIONS = {
        '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', 
        '.js', '.jar', '.app', '.dmg', '.pkg', '.deb', '.rpm'
    }
    
    # MIME type whitelist - ONLY allow these
    ALLOWED_MIME_TYPES = {
        # Images
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        # Documents  
        'application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        # Archives
        'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
        # Video
        'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
        # Audio
        'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
        # Text
        'text/plain', 'text/csv', 'text/html', 'text/css',
        # Other
        'application/json', 'application/xml'
    }
    
    # Magic byte signatures - verify actual file type
    FILE_SIGNATURES = {
        b'\xFF\xD8\xFF': 'image/jpeg',
        b'\x89\x50\x4E\x47': 'image/png',
        b'\x47\x49\x46\x38': 'image/gif',
        b'\x25\x50\x44\x46': 'application/pdf',
        b'\x50\x4B\x03\x04': 'application/zip',
        b'\x52\x61\x72\x21': 'application/x-rar-compressed'
    }
    
    @staticmethod
    def validate_file(file_content: bytes, filename: str, mime_type: str) -> bool:
        # Check extension
        # Check MIME type
        # Check magic bytes
        # Check for zip bombs
        # Scan for malware patterns
        pass
```

### 2. Authentication & Authorization

```python
# JWT Configuration - NEVER use defaults
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 60  # 1 hour max
JWT_REFRESH_TOKEN_EXPIRE_DAYS = 30

# Password requirements
PASSWORD_MIN_LENGTH = 8
PASSWORD_REQUIRE_UPPERCASE = True
PASSWORD_REQUIRE_LOWERCASE = True
PASSWORD_REQUIRE_NUMBERS = True
PASSWORD_REQUIRE_SPECIAL = True

# Bcrypt configuration
BCRYPT_ROUNDS = 12  # Minimum for 2024 standards

# Rate limiting per endpoint
RATE_LIMITS = {
    "/api/auth/login": "5 per minute",
    "/api/auth/register": "3 per hour",
    "/api/upload/anonymous": "10 per hour",
    "/api/upload": "100 per hour",  # Authenticated
    "/api/download/*": "100 per minute",
    "/api/auth/forgot-password": "3 per hour"
}
```

### 3. Input Validation & Sanitization

```python
# EVERY endpoint must validate input
from pydantic import BaseModel, validator, constr, conint
import bleach
import re

class FileUploadRequest(BaseModel):
    filename: constr(min_length=1, max_length=255)
    expires_in_minutes: conint(ge=30, le=10080)  # 30 min to 7 days
    password: Optional[constr(min_length=6, max_length=128)]
    
    @validator('filename')
    def sanitize_filename(cls, v):
        # Remove path traversal attempts
        v = os.path.basename(v)
        # Remove null bytes
        v = v.replace('\x00', '')
        # Allow only safe characters
        v = re.sub(r'[^a-zA-Z0-9._\- ]', '', v)
        # Prevent hidden files
        if v.startswith('.'):
            v = 'file_' + v
        return v[:255]  # Enforce max length

# SQL Injection Prevention - ALWAYS use parameterized queries
# NEVER do this:
# query = f"SELECT * FROM files WHERE id = '{file_id}'"
# 
# ALWAYS do this:
# query = "SELECT * FROM files WHERE id = %s"
# cursor.execute(query, (file_id,))
```

### 4. API Security Headers

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

app = FastAPI()

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response

# CORS - Configure specifically, never use "*"
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # SPECIFIC domains only
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)

# Trusted host validation
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["yourdomain.com", "*.yourdomain.com"]
)
```

### 5. File Storage Security

```python
import secrets
import hashlib

class SecureFileStorage:
    @staticmethod
    def generate_secure_filename(original_filename: str) -> str:
        """Generate unguessable filename"""
        timestamp = int(time.time())
        random_str = secrets.token_urlsafe(16)
        extension = os.path.splitext(original_filename)[1]
        
        # Hash to prevent enumeration
        filename_hash = hashlib.sha256(
            f"{timestamp}{random_str}{original_filename}".encode()
        ).hexdigest()[:16]
        
        return f"{timestamp}_{filename_hash}{extension}"
    
    @staticmethod
    def generate_short_code() -> str:
        """Generate cryptographically secure short code"""
        # 10 characters, ~60 bits of entropy
        # Practically unguessable
        return secrets.token_urlsafe(8)[:10]
    
    @staticmethod
    def scan_for_malware(file_path: str) -> bool:
        """Integrate with ClamAV for virus scanning"""
        # Install: apt-get install clamav clamav-daemon
        import pyclamd
        cd = pyclamd.ClamdAgnostic()
        result = cd.scan_file(file_path)
        return result is None  # None means clean
```

### 6. Rate Limiting Implementation

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Create limiter instance
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["1000 per hour"],
    storage_uri="redis://localhost:6379"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Apply to routes
@app.post("/api/upload/anonymous")
@limiter.limit("10 per hour")
async def upload_anonymous(file: UploadFile):
    # Also implement user-based limiting for authenticated routes
    pass

# Custom rate limiting for authenticated users
async def get_user_id(request: Request):
    # Extract user ID from JWT token
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if token:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("user_id", get_remote_address(request))
    return get_remote_address(request)
```

### 7. Download Security

```python
@app.get("/api/download/{short_code}")
async def download_file(short_code: str, password: Optional[str] = None):
    # 1. Validate short code format (alphanumeric only)
    if not re.match(r'^[a-zA-Z0-9_-]{10}$', short_code):
        raise HTTPException(400, "Invalid file code")
    
    # 2. Check if file exists and not expired
    file = db.query(File).filter(
        File.short_code == short_code,
        File.expires_at > datetime.utcnow(),
        File.deleted == False
    ).first()
    
    if not file:
        # Don't reveal if file existed
        raise HTTPException(404, "File not found or expired")
    
    # 3. Verify password if protected
    if file.password_hash:
        if not password or not bcrypt.checkpw(password.encode(), file.password_hash):
            # Add delay to prevent brute force
            await asyncio.sleep(1)
            raise HTTPException(401, "Invalid password")
    
    # 4. Check download limits
    if file.max_downloads and file.download_count >= file.max_downloads:
        raise HTTPException(410, "Download limit exceeded")
    
    # 5. Generate time-limited presigned URL (1 hour)
    presigned_url = generate_presigned_url(file.stored_filename, expires_in=3600)
    
    # 6. Log download
    db.add(DownloadLog(
        file_id=file.id,
        download_ip=request.client.host,
        user_agent=request.headers.get("User-Agent", "")
    ))
    file.download_count += 1
    db.commit()
    
    return {"download_url": presigned_url}
```

### 8. Database Security

```python
# Use environment variables - NEVER hardcode
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable not set")

# Connection pool configuration
engine = create_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True,  # Verify connections
    pool_recycle=3600,   # Recycle connections hourly
    connect_args={
        "sslmode": "require",  # Force SSL
        "connect_timeout": 10
    }
)

# Enable query logging in development only
if DEBUG:
    logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
```

## Frontend Security Implementation

### 1. XSS Prevention

```javascript
// NEVER use innerHTML with user content
// BAD:
// element.innerHTML = userContent;

// GOOD:
element.textContent = userContent;

// If HTML needed, sanitize first
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userContent, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href']
});

// React automatically escapes, but be careful with:
// - dangerouslySetInnerHTML (avoid!)
// - href attributes with javascript:
// - User-controlled URLs
```

### 2. Secure API Communication

```javascript
// Axios interceptor for auth
axios.interceptors.request.use(
    config => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    error => Promise.reject(error)
);

// Handle token expiry
axios.interceptors.response.use(
    response => response,
    async error => {
        if (error.response?.status === 401) {
            // Try refresh token
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                try {
                    const response = await axios.post('/api/auth/refresh', {
                        refresh_token: refreshToken
                    });
                    localStorage.setItem('access_token', response.data.access_token);
                    // Retry original request
                    return axios(error.config);
                } catch {
                    // Refresh failed, redirect to login
                    localStorage.clear();
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);
```

### 3. Content Security Policy

```html
<!-- In index.html -->
<meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://js.stripe.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self';
    connect-src 'self' https://api.yourdomain.com https://r2.yourdomain.com;
    frame-src https://js.stripe.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    upgrade-insecure-requests;
">
```

### 4. Client-Side Validation

```javascript
// File upload validation
const validateFile = (file) => {
    const errors = [];
    
    // Size check
    const maxSize = userTier === 'free' ? 100 * 1024 * 1024 : 5 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
        errors.push(`File too large. Maximum size: ${formatBytes(maxSize)}`);
    }
    
    // Type check (additional to backend)
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/zip',
        'video/mp4', 'audio/mpeg',
        'text/plain', 'application/json'
    ];
    
    if (!allowedTypes.includes(file.type)) {
        errors.push('File type not allowed');
    }
    
    // Name sanitization
    const safeName = file.name.replace(/[^a-zA-Z0-9._\- ]/g, '');
    if (safeName !== file.name) {
        console.warn('Filename contains unsafe characters');
    }
    
    return errors;
};
```

### 5. Secure Storage

```javascript
// NEVER store sensitive data in localStorage
// BAD:
// localStorage.setItem('password', userPassword);
// localStorage.setItem('credit_card', cardNumber);

// OK for tokens (but consider risks):
// localStorage.setItem('access_token', token);

// Better: Use httpOnly cookies for auth tokens
// Or use sessionStorage for temporary data

// Encrypt sensitive data if must store
import CryptoJS from 'crypto-js';

const encryptData = (data, key) => {
    return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
};

const decryptData = (encryptedData, key) => {
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};
```

## Infrastructure Security

### 1. Environment Variables

```bash
# .env.example (commit this)
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://localhost:6379
R2_ACCESS_KEY=your_key_here
R2_SECRET_KEY=your_secret_here
JWT_SECRET=generate_with_openssl_rand_-hex_32
STRIPE_SECRET_KEY=sk_test_...
SENDGRID_API_KEY=SG....

# Generate secure secrets:
# openssl rand -hex 32  # For JWT_SECRET
# python -c "import secrets; print(secrets.token_urlsafe(32))"  # Alternative
```

### 2. Cloudflare Configuration

```yaml
# Cloudflare Security Settings (via dashboard or API)
security_level: high
challenge_passage: 30
browser_integrity_check: true
hotlink_protection: true
email_obfuscation: true

# WAF Rules to create:
- name: "Block SQL Injection"
  expression: '(http.request.uri.query contains "union select") or (http.request.uri.query contains "' or '1'='1")'
  action: block

- name: "Block Path Traversal"
  expression: '(http.request.uri.path contains "..") or (http.request.uri.path contains "%2e%2e")'
  action: block

- name: "Rate Limit Uploads"
  expression: '(http.request.uri.path eq "/api/upload")'
  action: rate_limit
  rate: 10 requests per 1 minute

- name: "Protect Admin"
  expression: '(http.request.uri.path contains "/admin")'
  action: challenge
```

### 3. Monitoring & Alerts

```python
# Sentry configuration for error tracking
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=os.environ.get("SENTRY_DSN"),
    integrations=[FastApiIntegration()],
    traces_sample_rate=0.1,
    environment=os.environ.get("ENVIRONMENT", "production"),
    before_send=lambda event, hint: sanitize_event(event)  # Remove sensitive data
)

# Custom security alerts
async def alert_suspicious_activity(event_type: str, details: dict):
    # Send to logging service
    logger.warning(f"SECURITY: {event_type}", extra=details)
    
    # Critical alerts via email/Slack
    if event_type in ["multiple_failed_logins", "malware_detected", "rate_limit_abuse"]:
        await send_security_alert(event_type, details)
```

## Security Testing Checklist

### Automated Tests Required

```python
# Test file: test_security.py
import pytest
from fastapi.testclient import TestClient

def test_sql_injection_protection():
    """Ensure SQL injection attempts are blocked"""
    response = client.get("/api/download/test' OR '1'='1")
    assert response.status_code == 400

def test_path_traversal_protection():
    """Ensure path traversal attempts are blocked"""
    response = client.post("/api/upload", files={
        "file": ("../../../etc/passwd", b"content", "text/plain")
    })
    assert response.status_code == 400

def test_rate_limiting():
    """Ensure rate limits are enforced"""
    for i in range(15):
        response = client.post("/api/upload/anonymous", files={
            "file": ("test.txt", b"content", "text/plain")
        })
        if i < 10:
            assert response.status_code == 200
        else:
            assert response.status_code == 429  # Too Many Requests

def test_xss_prevention():
    """Ensure XSS attempts are sanitized"""
    response = client.post("/api/upload", files={
        "file": ("<script>alert('xss')</script>.txt", b"content", "text/plain")
    })
    assert "<script>" not in response.json()["filename"]

def test_password_brute_force_protection():
    """Ensure password attempts are rate limited"""
    for i in range(10):
        response = client.get("/api/download/validcode", params={
            "password": f"wrong{i}"
        })
        assert response.status_code == 401
        # Should have increasing delay
```

## Security Incident Response

```python
# Create incident_response.py
class SecurityIncident:
    SEVERITY_LEVELS = {
        "CRITICAL": ["data_breach", "malware_spread", "account_takeover"],
        "HIGH": ["brute_force_attempt", "sql_injection_attempt", "suspicious_file"],
        "MEDIUM": ["rate_limit_abuse", "invalid_file_type", "failed_login_spike"],
        "LOW": ["invalid_input", "404_scan", "single_failed_login"]
    }
    
    @staticmethod
    async def handle_incident(incident_type: str, details: dict):
        severity = SecurityIncident.get_severity(incident_type)
        
        # Log everything
        logger.error(f"SECURITY INCIDENT: {incident_type}", extra={
            "severity": severity,
            "details": details,
            "timestamp": datetime.utcnow()
        })
        
        # Take action based on severity
        if severity == "CRITICAL":
            # Immediate response
            await SecurityIncident.lockdown_mode()
            await SecurityIncident.notify_team_emergency(incident_type, details)
            
        elif severity == "HIGH":
            # Block IP/User
            await SecurityIncident.block_source(details.get("ip"), details.get("user_id"))
            await SecurityIncident.notify_team(incident_type, details)
```

## Final Security Checklist

Before going live, ensure ALL of these are implemented:

- [ ] All passwords hashed with bcrypt (12+ rounds)
- [ ] JWT tokens expire in 1 hour or less
- [ ] Rate limiting on ALL endpoints
- [ ] File type validation (extension + MIME + magic bytes)
- [ ] Virus scanning for files > 10MB
- [ ] SQL injection protection (parameterized queries)
- [ ] XSS prevention (input sanitization)
- [ ] CSRF protection
- [ ] Secure headers on all responses
- [ ] HTTPS enforced everywhere
- [ ] Presigned URLs for file access (never direct)
- [ ] Path traversal protection
- [ ] Zip bomb protection
- [ ] Admin panel IP whitelisted
- [ ] Monitoring and alerting configured
- [ ] Incident response plan tested
- [ ] Security audit completed
- [ ] Penetration testing performed
- [ ] Backup strategy implemented
- [ ] Disaster recovery plan documented

Remember: Security is not optional. One vulnerability can destroy your business.