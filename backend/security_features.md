# ZnapFile Security Features

## How We Protect Your Data

### 🔐 Account Security
- **Strong Password Requirements**: Minimum 8 characters with complexity requirements
- **Two-Factor Authentication (2FA)**: Optional TOTP-based 2FA with backup codes
- **Secure Password Storage**: bcrypt hashing with automatic salts
- **Email Verification**: Required for free accounts to prevent abuse

### 🛡️ File Protection
- **Password-Protected Transfers**: Optional passwords for any file share
- **Max Password Attempts**: Configurable limit (default 10) to prevent brute force
- **Time-Limited Links**: All download links expire automatically
- **Pre-signed URLs**: Direct, secure downloads without exposing file paths
- **Filename Sanitization**: Prevents malicious filenames and path traversal
- **Virus Scanning**: Optional integration with ClamAV or VirusTotal

### 🚦 Rate Limiting
- **Login Protection**: 5 attempts per minute
- **Upload Limits**: Prevents abuse while allowing legitimate use
- **Download Throttling**: Fair usage for all users
- **Registration Limits**: 3 new accounts per hour per IP

### 🔒 Infrastructure Security
- **HTTPS Only**: All connections encrypted with TLS
- **Security Headers**: Protection against XSS, clickjacking, and other attacks
- **CORS Protection**: Prevents unauthorized cross-origin requests
- **SQL Injection Prevention**: Parameterized queries throughout

### 📊 Monitoring & Compliance
- **Error Tracking**: Sentry integration for security incident detection
- **Activity Logging**: Key operations are logged for security analysis
- **GDPR Ready**: Data deletion and user privacy controls
- **No Tracking**: No analytics or user tracking scripts

### 🚀 Advanced Features
- **Zip Bomb Protection**: Prevents malicious compressed files
- **MIME Type Validation**: Verifies file types match content
- **Trusted Host Validation**: Production environment protection
- **JWT Authentication**: Secure, stateless authentication tokens

### 🔐 File Encryption
- **AES-128 Encryption**: All files encrypted using Fernet (AES-128 CBC mode)
- **Unique Keys**: Each file gets its own encryption key derived from master key
- **Transparent Operation**: Encryption/decryption happens automatically
- **Secure Key Management**: Master key stored as environment variable

### 🔮 Coming Soon
- **Virus Scanning**: Automatic malware detection
- **Advanced Audit Logs**: Comprehensive activity tracking
- **Geographic Restrictions**: IP-based access controls

## Your Privacy Matters

At ZnapFile, we believe in:
- **No Data Mining**: We don't scan or analyze your files
- **No Ads**: Your data isn't the product
- **No Third-Party Access**: Your files stay between you and your recipients
- **Transparent Security**: Open about our security measures

## Security Best Practices for Users

1. **Use Strong Passwords**: Take advantage of our password requirements
2. **Enable 2FA**: Add an extra layer of security to your account
3. **Password-Protect Sensitive Files**: Use the password feature for confidential data
4. **Set Appropriate Expiry Times**: Shorter times for sensitive content
5. **Verify Recipients**: Double-check email addresses before sharing

## Report Security Issues

Found a security vulnerability? Please report it to security@znapfile.com. We take all security reports seriously and will respond within 24 hours.

---

*Last Updated: January 2024*