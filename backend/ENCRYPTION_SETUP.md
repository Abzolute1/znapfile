# File Encryption Setup

File encryption has been implemented for ZnapFile. All files are now encrypted before storage using AES-128 encryption (Fernet).

## Setup Instructions

1. **Generate a Master Encryption Key**:
   ```bash
   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   ```

2. **Add to Environment Variables**:
   Add the generated key to your `.env` file:
   ```
   ENCRYPTION_MASTER_KEY=your_generated_key_here
   ```

3. **Important Security Notes**:
   - Store the master key securely (consider using AWS KMS, HashiCorp Vault, or similar)
   - Never commit the master key to version control
   - Back up the master key - losing it means losing access to all encrypted files
   - Consider rotating the key periodically for enhanced security

## How It Works

- Each file gets a unique encryption key derived from the master key + file ID
- Files are encrypted before uploading to storage (R2/S3 or local)
- Files are decrypted transparently when downloaded
- The encryption is completely transparent to users

## Migration Note

If you have existing unencrypted files, they will continue to work. The system will:
- Encrypt new files going forward
- Attempt to decrypt existing files (will fail gracefully if they're not encrypted)

For a full migration of existing files to encrypted format, a separate migration script would be needed.