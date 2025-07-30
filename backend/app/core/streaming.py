"""
Streaming file upload utilities to prevent memory DoS
"""

import os
import tempfile
import hashlib
from typing import AsyncIterator, Tuple, Optional
from fastapi import UploadFile
import aiofiles
import magic


class StreamingFileHandler:
    """Handle large file uploads with streaming to prevent memory exhaustion"""
    
    CHUNK_SIZE = 1024 * 1024  # 1MB chunks
    MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB - files smaller than this stay in memory
    
    @staticmethod
    async def process_upload_stream(
        file: UploadFile,
        max_size: int
    ) -> Tuple[str, int, str, bytes]:
        """
        Process file upload in chunks
        Returns: (temp_file_path, file_size, mime_type, first_chunk_for_validation)
        """
        # Create temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False)
        temp_path = temp_file.name
        
        hasher = hashlib.sha256()
        total_size = 0
        first_chunk = None
        
        try:
            # Read and write in chunks
            async with aiofiles.open(temp_path, 'wb') as f:
                while True:
                    chunk = await file.read(StreamingFileHandler.CHUNK_SIZE)
                    if not chunk:
                        break
                    
                    # Store first chunk for MIME type detection
                    if first_chunk is None:
                        first_chunk = chunk[:8192]  # First 8KB for magic bytes
                    
                    # Check size limit
                    total_size += len(chunk)
                    if total_size > max_size:
                        os.unlink(temp_path)
                        raise ValueError(f"File size exceeds limit of {max_size} bytes")
                    
                    # Update hash
                    hasher.update(chunk)
                    
                    # Write to temp file
                    await f.write(chunk)
            
            # Detect MIME type from first chunk
            if first_chunk:
                mime = magic.Magic(mime=True)
                mime_type = mime.from_buffer(first_chunk)
            else:
                mime_type = "application/octet-stream"
            
            return temp_path, total_size, mime_type, first_chunk
            
        except Exception as e:
            # Clean up temp file on error
            if os.path.exists(temp_path):
                os.unlink(temp_path)
            raise e
    
    @staticmethod
    async def read_file_chunks(
        file_path: str,
        chunk_size: int = CHUNK_SIZE
    ) -> AsyncIterator[bytes]:
        """Read file in chunks for streaming operations"""
        async with aiofiles.open(file_path, 'rb') as f:
            while True:
                chunk = await f.read(chunk_size)
                if not chunk:
                    break
                yield chunk
    
    @staticmethod
    def cleanup_temp_file(temp_path: str):
        """Clean up temporary file"""
        try:
            if os.path.exists(temp_path):
                os.unlink(temp_path)
        except Exception:
            pass  # Best effort cleanup
    
    @staticmethod
    async def validate_file_stream(
        temp_path: str,
        filename: str,
        mime_type: str,
        first_chunk: bytes
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate file without loading entire content into memory
        Returns: (is_valid, error_message)
        """
        # Basic MIME type validation
        dangerous_types = [
            'application/x-executable',
            'application/x-dosexec',
            'application/x-msdownload',
            'application/x-msdos-program'
        ]
        
        if mime_type in dangerous_types:
            return False, "Executable files are not allowed"
        
        # Validate by extension
        ext = os.path.splitext(filename)[1].lower()
        executable_extensions = {
            '.exe', '.com', '.bat', '.cmd', '.msi', '.scr',
            '.vbs', '.js', '.jar', '.app', '.deb', '.rpm'
        }
        
        if ext in executable_extensions:
            return False, f"File type {ext} is not allowed"
        
        return True, None


class ChunkedStorageUploader:
    """Upload large files to storage in chunks"""
    
    @staticmethod
    async def upload_from_temp_file(
        storage_service,
        temp_path: str,
        stored_filename: str,
        mime_type: str
    ) -> bool:
        """Upload file from temporary path to storage service"""
        try:
            # For S3/R2, we can use multipart upload for large files
            file_size = os.path.getsize(temp_path)
            
            if file_size < StreamingFileHandler.MAX_MEMORY_SIZE:
                # Small file - read into memory
                async with aiofiles.open(temp_path, 'rb') as f:
                    file_data = await f.read()
                return await storage_service.upload_file(file_data, stored_filename, mime_type)
            else:
                # Large file - use multipart upload
                return await storage_service.upload_file_multipart(
                    temp_path, 
                    stored_filename, 
                    mime_type
                )
        except Exception as e:
            print(f"Error uploading file: {e}")
            return False