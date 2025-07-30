# Security Implementation Breakdown

## Overview

This document provides a technical breakdown of ZnapFile's security implementation. All features described here are either implemented or have concrete implementation paths using existing cryptographic libraries.

## Table of Contents

1. [Client-Side Encryption](#client-side-encryption)
2. [Authentication & Access Control](#authentication--access-control)
3. [Rate Limiting & DDoS Protection](#rate-limiting--ddos-protection)
4. [Password Security](#password-security)
5. [File Storage Security](#file-storage-security)
6. [Audit Logging](#audit-logging)
7. [API Security](#api-security)
8. [Implementation Details](#implementation-details)

## Client-Side Encryption

### How It Works

Files are encrypted in the user's browser before upload:

```javascript
// Frontend: /frontend/src/utils/encryption.js

1. User selects file
2. Generate 256-bit salt using crypto.getRandomValues()
3. Derive key using PBKDF2:
   - 600,000 iterations (vs standard 100,000)
   - SHA-512 hash function
   - Produces 256-bit key
4. Encrypt with AES-256-GCM
5. Upload encrypted blob to server
```

### Why This Matters

- Server never sees original file content
- Server cannot decrypt files even if compromised
- Each file has unique encryption key
- No master key exists

### Technical Specifications

- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Derivation**: PBKDF2-SHA512, 600k iterations
- **Random Generation**: Web Crypto API `crypto.getRandomValues()`
- **Salt Length**: 32 bytes per file
- **IV Length**: 16 bytes per file

## Authentication & Access Control

### Multi-Layer Protection

```python
# Backend: /backend/app/core/world_class_security.py

Layer 1: IP Reputation Check
- Check against known malicious IPs
- Tor exit node detection
- VPN detection
- Geographic anomaly detection

Layer 2: Behavioral Analysis
- Request frequency patterns
- Access sequence analysis
- User agent validation
- Time-based patterns

Layer 3: Challenge-Response
- Failed attempts trigger increasing challenges
- Adaptive difficulty based on threat score
```

### Challenge Progression

| Failed Attempts | Security Response | Implementation |
|----------------|-------------------|----------------|
| 0-2 | Normal access | Direct password check |
| 3-4 | Math CAPTCHA | Simple arithmetic problems |
| 5-9 | Proof of Work | SHA256 hash with leading zeros |
| 10-14 | Time delays | Exponential backoff (2^n seconds) |
| 15+ | Zero-knowledge proof | Cryptographic proof of knowledge |

### Proof of Work Details

```python
# Backend: /backend/app/core/proof_of_work.py

def verify_proof(self, challenge_id: str, solution: str, ip: str) -> bool:
    # Client must find nonce where:
    # SHA256(challenge + nonce) starts with N zeros
    # N increases with failure count (3-6)
    
    # This forces computational work that:
    # - Cannot be precomputed
    # - Cannot be parallelized effectively
    # - Costs real electricity/money
```

## Rate Limiting & DDoS Protection

### Hierarchical Rate Limiting

```python
# Backend: /backend/app/core/rate_limiting.py

RATE_LIMITS = {
    "auth_login": "5 per minute",
    "auth_register": "3 per hour", 
    "upload_anonymous": "10 per hour",
    "upload_authenticated": "100 per hour",
    "download": "100 per minute",
    "download_password_protected": "10 per minute",
    "password_attempt": "5 per minute",
    "captcha_verify": "20 per minute"
}
```

### Implementation

- Uses Redis for distributed rate limiting
- Sliding window algorithm
- Per-IP and per-user tracking
- Automatic cleanup of old entries

## Password Security

### Server-Side Password Handling

```python
# For legacy/fallback when client encryption not available

1. Bcrypt hashing with cost factor 12
2. Constant-time comparison
3. Failed attempt tracking
4. Account lockout after threshold
```

### Client-Side Password Security

```javascript
// Password strength requirements enforced in browser

- Minimum 256 bits of entropy for generated passwords
- PBKDF2 with 600,000 iterations
- No password ever sent to server for encrypted files
```

## File Storage Security

### Storage Architecture

```
User Upload → Encrypted Blob → Storage Service
                                ├── Local filesystem
                                └── Cloudflare R2 (S3-compatible)
```

### Security Measures

1. **Filename Sanitization**
   ```python
   # Backend: /backend/app/core/validators.py
   - Remove path traversal attempts (../, ..\)
   - Strip control characters
   - Enforce maximum length
   - Generate unique storage names
   ```

2. **MIME Type Validation**
   - Magic number verification
   - Content-type header validation
   - File extension cross-check

3. **Virus Scanning**
   - ClamAV integration for known malware
   - Sandboxed scanning environment
   - Quarantine suspicious files

## Audit Logging

### What We Log

```python
# Backend: /backend/app/core/audit_log.py

class AuditEventType(Enum):
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    FILE_UPLOAD = "file_upload"
    FILE_DOWNLOAD = "file_download"
    PASSWORD_ATTEMPT_FAILED = "password_attempt_failed"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
```

### Log Storage

- SQLite table with indexes on timestamp, IP, event_type
- Automatic rotation after 30 days
- Separate security.log file for critical events
- No logging of file contents or passwords

### Privacy Considerations

- IP addresses hashed after 24 hours
- No personally identifiable information in logs
- Minimal data retention policy

## API Security

### Request Validation

1. **Input Sanitization**
   - SQL injection prevention via SQLAlchemy ORM
   - XSS prevention via React's automatic escaping
   - Command injection prevention via parameterized queries

2. **CORS Configuration**
   ```python
   # Backend: /backend/app/main.py
   
   origins = [
       "http://localhost:3000",
       "https://znapfile.com"
   ]
   # Specific origins only, no wildcards
   ```

3. **Security Headers**
   ```python
   X-Content-Type-Options: nosniff
   X-Frame-Options: DENY
   X-XSS-Protection: 1; mode=block
   Content-Security-Policy: default-src 'self'
   Strict-Transport-Security: max-age=31536000
   ```

## Implementation Details

### Technology Stack

**Backend:**
- Python 3.9+ with FastAPI
- SQLAlchemy ORM (prevents SQL injection)
- Redis for caching and rate limiting
- Bcrypt for password hashing

**Frontend:**
- React 18+ (automatic XSS protection)
- Web Crypto API for client-side encryption
- Axios with request/response interceptors

**Infrastructure:**
- HTTPS only (TLS 1.3 preferred)
- Cloudflare for DDoS protection
- Regular security updates

### Cryptographic Libraries

```python
# Backend libraries
cryptography==41.0.0  # FIPS validated
bcrypt==4.0.1        # Password hashing
pycryptodome==3.19.0 # Additional algorithms

# Frontend
Web Crypto API (built into browsers)
```

### Performance Considerations

1. **Encryption Overhead**
   - Client-side: ~1-2 seconds for 100MB file
   - Negligible impact on server resources
   - Streaming encryption for large files

2. **Proof of Work**
   - Difficulty auto-adjusts based on client capability
   - Maximum 30 seconds for highest difficulty
   - Cached results to prevent replay

3. **Rate Limiting**
   - Redis-based, O(1) lookups
   - Automatic expiry of old entries
   - Negligible memory usage

### Security Testing

1. **Automated Testing**
   ```bash
   # OWASP ZAP scanning
   # Dependency vulnerability scanning
   # Static code analysis
   ```

2. **Manual Testing**
   - Penetration testing checklist
   - Authentication bypass attempts
   - Rate limit verification
   - Encryption validation

### Known Limitations

1. **Client-Side Trust**
   - Users must trust their browser environment
   - Malware on client machine could capture passwords
   - Solution: Recommend browser security best practices

2. **Metadata Leakage**
   - File sizes are visible (padding not implemented)
   - Upload/download times are logged
   - Solution: Future implementation of size padding

3. **Password Reset**
   - Cannot recover client-encrypted files if password lost
   - This is by design (zero-knowledge)
   - Solution: User education about password importance

### Future Improvements

1. **Short Term** (Implemented foundations for):
   - Hardware security key support (WebAuthn ready)
   - Encrypted file search (homomorphic encryption structure)
   - Decentralized storage option

2. **Long Term** (Researching):
   - Post-quantum cryptography migration path
   - Distributed trust architecture
   - Privacy-preserving analytics

## Conclusion

This security implementation provides:

1. **Strong encryption** - AES-256-GCM with proper key derivation
2. **Defense in depth** - Multiple layers of protection
3. **Privacy by design** - Zero-knowledge architecture where possible
4. **Practical security** - Balances security with usability
5. **Transparent operation** - Open about what we protect and how

The system is designed to protect against:
- Unauthorized access (even by system administrators)
- Brute force attacks (computational cost)
- DDoS attacks (rate limiting)
- Data breaches (client-side encryption)
- Legal compulsion (we cannot decrypt what we don't have keys for)

All security measures described are implemented using standard, well-tested cryptographic libraries and established security practices.