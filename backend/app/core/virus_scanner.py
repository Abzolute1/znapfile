"""
Virus scanning integration for file uploads
Using ClamAV REST API or similar services
"""
import httpx
import logging
from typing import Tuple, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


class VirusScanner:
    """
    Virus scanner integration.
    Can use either:
    1. ClamAV REST API (requires clamav-rest server)
    2. VirusTotal API (requires API key)
    3. Disabled (default for development)
    """
    
    def __init__(self):
        self.enabled = getattr(settings, 'VIRUS_SCAN_ENABLED', False)
        self.service = getattr(settings, 'VIRUS_SCAN_SERVICE', 'disabled')
        self.api_url = getattr(settings, 'VIRUS_SCAN_API_URL', '')
        self.api_key = getattr(settings, 'VIRUS_SCAN_API_KEY', '')
        self.timeout = getattr(settings, 'VIRUS_SCAN_TIMEOUT', 30)
        
        if self.enabled:
            logger.info(f"Virus scanning enabled using {self.service}")
    
    async def scan_file(self, file_data: bytes, filename: str) -> Tuple[bool, Optional[str]]:
        """
        Scan file for viruses.
        Returns: (is_clean, threat_name)
        - is_clean: True if no virus found, False if virus found
        - threat_name: Name of the threat if found, None otherwise
        """
        if not self.enabled:
            return True, None
        
        try:
            if self.service == 'clamav':
                return await self._scan_with_clamav(file_data, filename)
            elif self.service == 'virustotal':
                return await self._scan_with_virustotal(file_data, filename)
            else:
                logger.warning(f"Unknown virus scan service: {self.service}")
                return True, None
                
        except Exception as e:
            logger.error(f"Virus scan failed: {e}")
            # Fail open - allow file if scanner fails
            # You might want to fail closed (reject file) in production
            return True, None
    
    async def _scan_with_clamav(self, file_data: bytes, filename: str) -> Tuple[bool, Optional[str]]:
        """
        Scan with ClamAV REST API
        Requires running: docker run -p 8080:8080 mkodockx/docker-clamav-rest
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                # ClamAV REST expects multipart form data
                files = {'file': (filename, file_data)}
                response = await client.post(
                    f"{self.api_url}/scan",
                    files=files
                )
                
                if response.status_code == 200:
                    result = response.json()
                    # ClamAV REST returns: {"Status": "OK"} or {"Status": "FOUND", "Description": "threat-name"}
                    is_clean = result.get('Status') == 'OK'
                    threat_name = result.get('Description') if not is_clean else None
                    
                    if not is_clean:
                        logger.warning(f"Virus found in {filename}: {threat_name}")
                    
                    return is_clean, threat_name
                else:
                    logger.error(f"ClamAV scan failed with status {response.status_code}")
                    return True, None
                    
            except httpx.TimeoutException:
                logger.error("ClamAV scan timed out")
                return True, None
    
    async def _scan_with_virustotal(self, file_data: bytes, filename: str) -> Tuple[bool, Optional[str]]:
        """
        Scan with VirusTotal API
        Note: Free tier has rate limits (4 requests/minute)
        """
        if not self.api_key:
            logger.error("VirusTotal API key not configured")
            return True, None
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                # Upload file to VirusTotal
                headers = {'x-apikey': self.api_key}
                files = {'file': (filename, file_data)}
                
                response = await client.post(
                    'https://www.virustotal.com/api/v3/files',
                    headers=headers,
                    files=files
                )
                
                if response.status_code == 200:
                    result = response.json()
                    # VirusTotal returns analysis ID, need to check results
                    analysis_id = result['data']['id']
                    
                    # Check analysis results
                    analysis_response = await client.get(
                        f'https://www.virustotal.com/api/v3/analyses/{analysis_id}',
                        headers=headers
                    )
                    
                    if analysis_response.status_code == 200:
                        analysis = analysis_response.json()
                        stats = analysis['data']['attributes']['stats']
                        
                        # Consider file malicious if any engine detects it
                        is_clean = stats.get('malicious', 0) == 0
                        threat_name = 'Multiple threats detected' if not is_clean else None
                        
                        if not is_clean:
                            logger.warning(f"Virus found in {filename} by {stats['malicious']} engines")
                        
                        return is_clean, threat_name
                
                logger.error(f"VirusTotal scan failed with status {response.status_code}")
                return True, None
                
            except httpx.TimeoutException:
                logger.error("VirusTotal scan timed out")
                return True, None


# Singleton instance
virus_scanner = VirusScanner()