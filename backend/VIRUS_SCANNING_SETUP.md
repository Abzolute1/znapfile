# Virus Scanning Setup

Virus scanning has been integrated into ZnapFile. The system supports multiple virus scanning services.

## Supported Services

### 1. ClamAV REST API (Recommended for self-hosted)
- Open source, no API limits
- Can run locally with Docker
- Fast scanning

### 2. VirusTotal API
- Cloud-based, no local setup needed
- Free tier: 4 requests/minute
- Requires API key

## Setup Instructions

### Option 1: ClamAV (Self-hosted)

1. **Run ClamAV REST server with Docker**:
   ```bash
   docker run -d -p 8080:8080 --name clamav mkodockx/docker-clamav-rest
   ```

2. **Configure in `.env`**:
   ```
   VIRUS_SCAN_ENABLED=true
   VIRUS_SCAN_SERVICE=clamav
   VIRUS_SCAN_API_URL=http://localhost:8080
   ```

### Option 2: VirusTotal (Cloud)

1. **Get API key**:
   - Sign up at https://www.virustotal.com
   - Get your API key from your account

2. **Configure in `.env`**:
   ```
   VIRUS_SCAN_ENABLED=true
   VIRUS_SCAN_SERVICE=virustotal
   VIRUS_SCAN_API_KEY=your_api_key_here
   ```

### Option 3: Disabled (Default)

No configuration needed. Files won't be scanned for viruses.

## How It Works

- Files are scanned during upload before being stored
- If a virus is detected, the upload is rejected with a 422 error
- If the scanner fails or times out, files are allowed (fail-open)
- Scan timeout is configurable (default: 30 seconds)

## Production Considerations

1. **Performance**: Virus scanning adds latency to uploads
2. **Rate Limits**: VirusTotal free tier is limited to 4 scans/minute
3. **Fail Strategy**: Currently fails open (allows files if scanner fails). Consider failing closed for higher security
4. **Resource Usage**: ClamAV requires ~1GB RAM when running

## Testing

To test virus scanning without actual malware:
1. Use the EICAR test file: https://www.eicar.org/download-anti-malware-testfile/
2. This is a harmless file that all antivirus software detects as malware for testing