# Zero-Knowledge Security Implementation Plan

## Goal: True Privacy Where Even ZnapFile Can't Access User Files

### Current Security vs Target Security

**Current State:**
- Files encrypted at rest ✅
- HTTPS encryption in transit ✅
- Server can decrypt files ❌
- Admin could theoretically access files ❌

**Target State (Zero-Knowledge):**
- Client-side encryption before upload
- Server never sees decryption keys
- Even with server access, files remain encrypted
- FBI/Court order = useless (we literally can't decrypt)

## Implementation Steps

### 1. Client-Side Encryption (Browser)
```javascript
// Generate encryption key from password
async function deriveKey(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

// Encrypt file before upload
async function encryptFile(file, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)
  
  const fileBuffer = await file.arrayBuffer()
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    fileBuffer
  )
  
  // Combine salt + iv + encrypted data
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(encrypted), salt.length + iv.length)
  
  return combined
}
```

### 2. Server-Side Changes
```python
# Server NEVER stores passwords or keys
# Only stores encrypted blob
class File(Base):
    # Remove password_hash field entirely
    # Add encryption metadata
    client_encrypted = Column(Boolean, default=False)
    encryption_algorithm = Column(String(50))  # "AES-256-GCM"
    
# No server-side decryption possible
```

### 3. Download & Decryption
```javascript
// Decrypt in browser after download
async function decryptFile(encryptedData, password) {
  const salt = encryptedData.slice(0, 16)
  const iv = encryptedData.slice(16, 28)
  const data = encryptedData.slice(28)
  
  const key = await deriveKey(password, salt)
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    data
  )
  
  return decrypted
}
```

## Additional Privacy Features

### 1. Metadata Protection
- Encrypt original filename
- Pad file sizes to standard blocks
- Randomize upload times in logs

### 2. Anonymous Accounts
```python
# Allow account creation without email
class User(Base):
    email = Column(String(255), unique=True, nullable=True)  # Make optional
    username = Column(String(50), unique=True, nullable=False)
    recovery_code = Column(String(255))  # For password recovery without email
```

### 3. Plausible Deniability
- Hidden files feature (steganography)
- Decoy passwords that show different content
- Canary files that alert on access

### 4. Onion Routing Support
```nginx
# Tor hidden service configuration
server {
    listen 127.0.0.1:8080;
    server_name znapfile.onion;
    
    # Disable all logging for Tor users
    access_log off;
    error_log /dev/null;
}
```

### 5. Secure Deletion
```python
import os
import random

def secure_delete(filepath):
    """Overwrite file multiple times before deletion"""
    filesize = os.path.getsize(filepath)
    
    with open(filepath, "ba+", buffering=0) as f:
        # Overwrite with random data 3 times
        for _ in range(3):
            f.seek(0)
            f.write(os.urandom(filesize))
            f.flush()
            os.fsync(f.fileno())
    
    # Remove file
    os.remove(filepath)
```

## Legal Compliance Strategy

### Warrant Canary
```python
# Automated canary that updates daily
# If it stops updating, users know something happened
class WarrantCanary(Base):
    last_updated = Column(DateTime, default=func.now())
    message = Column(String(500), default=
        "As of {date}, ZnapFile has not received any:"
        "- National Security Letters"
        "- FISA court orders"  
        "- Gag orders"
    )
```

### Minimal Data Retention
- Delete IP addresses after 24 hours
- No permanent logs
- Auto-delete expired files immediately

### Geographic Distribution
- Servers in privacy-friendly jurisdictions
- Switzerland, Iceland, etc.
- No servers in Five Eyes countries

## Implementation Priority

1. **Phase 1** (1 week): Client-side encryption
2. **Phase 2** (2 weeks): Remove server-side decryption capability
3. **Phase 3** (1 week): Anonymous accounts
4. **Phase 4** (ongoing): Additional privacy features

## Result: True Zero-Knowledge Architecture

With this implementation:
- ✅ FBI gets encrypted blobs they can't decrypt
- ✅ Even you (the owner) can't see user content
- ✅ Court orders become meaningless
- ✅ Users have true privacy

"Not even God can read your files" - that's the level of privacy we're building.