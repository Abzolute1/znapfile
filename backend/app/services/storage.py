from typing import Optional, BinaryIO
from app.core.config import settings
from app.core.encryption import file_encryption
from datetime import timedelta
import os
import aiofiles
import asyncio

try:
    import boto3
    from botocore.exceptions import ClientError
    BOTO_AVAILABLE = True
except ImportError:
    BOTO_AVAILABLE = False
    ClientError = Exception


class MockStorageService:
    """Mock storage for development without R2"""
    def __init__(self):
        # Use project root uploads directory
        self.storage_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'uploads'))
        os.makedirs(self.storage_path, exist_ok=True)
        self.multipart_threshold = 100 * 1024 * 1024  # 100MB
        print(f"Mock storage initialized at: {self.storage_path}")
    
    async def upload_file(self, file_data: bytes, stored_filename: str, content_type: str) -> bool:
        try:
            # Encrypt file data if encryption is available
            if file_encryption:
                file_data = file_encryption.encrypt_file(file_data, stored_filename)
            
            file_path = os.path.join(self.storage_path, stored_filename)
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(file_data)
            return True
        except:
            return False
    
    def generate_presigned_upload_url(self, stored_filename: str, content_type: str, expires_in: int = 3600) -> str:
        return f"/mock-upload/{stored_filename}"
    
    def generate_presigned_download_url(self, stored_filename: str, original_filename: str, expires_in: int = 3600) -> str:
        return f"http://localhost:8000/api/v1/mock-download/{stored_filename}?name={original_filename}"
    
    async def delete_file(self, stored_filename: str) -> bool:
        try:
            file_path = os.path.join(self.storage_path, stored_filename)
            if os.path.exists(file_path):
                os.remove(file_path)
            return True
        except:
            return False
    
    async def file_exists(self, stored_filename: str) -> bool:
        file_path = os.path.join(self.storage_path, stored_filename)
        return os.path.exists(file_path)
    
    async def download_file(self, stored_filename: str) -> Optional[bytes]:
        try:
            file_path = os.path.join(self.storage_path, stored_filename)
            
            if not os.path.exists(file_path):
                print(f"File not found: {file_path}")
                return None
                
            async with aiofiles.open(file_path, 'rb') as f:
                file_data = await f.read()
            
            # Decrypt file data if encryption is available
            if file_encryption:
                file_data = file_encryption.decrypt_file(file_data, stored_filename)
            
            return file_data
        except Exception as e:
            print(f"Error downloading file {stored_filename}: {e}")
            return None
    
    async def upload_file_multipart(self, file_path: str, stored_filename: str, content_type: str) -> bool:
        """Upload large file by copying in chunks"""
        try:
            dest_path = os.path.join(self.storage_path, stored_filename)
            
            # Read and write in chunks
            chunk_size = 10 * 1024 * 1024  # 10MB chunks
            
            async with aiofiles.open(file_path, 'rb') as src:
                async with aiofiles.open(dest_path, 'wb') as dst:
                    while True:
                        chunk = await src.read(chunk_size)
                        if not chunk:
                            break
                        
                        # Encrypt chunk if needed
                        if file_encryption:
                            chunk = file_encryption.encrypt_file(chunk, f"{stored_filename}_chunk")
                        
                        await dst.write(chunk)
            
            return True
        except Exception as e:
            print(f"Multipart upload failed: {e}")
            return False
    
    async def upload_file_multipart(self, file_path: str, stored_filename: str, content_type: str) -> bool:
        """Upload large file using multipart upload"""
        try:
            file_size = os.path.getsize(file_path)
            
            # Initiate multipart upload
            response = self.s3_client.create_multipart_upload(
                Bucket=self.bucket,
                Key=stored_filename,
                ContentType=content_type
            )
            upload_id = response['UploadId']
            
            # Upload parts
            parts = []
            part_size = 10 * 1024 * 1024  # 10MB parts
            part_number = 1
            
            with open(file_path, 'rb') as f:
                while True:
                    data = f.read(part_size)
                    if not data:
                        break
                    
                    # Encrypt part if needed
                    if file_encryption:
                        data = file_encryption.encrypt_file(data, f"{stored_filename}_part{part_number}")
                    
                    response = self.s3_client.upload_part(
                        Bucket=self.bucket,
                        Key=stored_filename,
                        PartNumber=part_number,
                        UploadId=upload_id,
                        Body=data
                    )
                    
                    parts.append({
                        'ETag': response['ETag'],
                        'PartNumber': part_number
                    })
                    
                    part_number += 1
            
            # Complete multipart upload
            self.s3_client.complete_multipart_upload(
                Bucket=self.bucket,
                Key=stored_filename,
                UploadId=upload_id,
                MultipartUpload={'Parts': parts}
            )
            
            return True
            
        except Exception as e:
            print(f"Multipart upload failed: {e}")
            # Abort multipart upload on failure
            try:
                self.s3_client.abort_multipart_upload(
                    Bucket=self.bucket,
                    Key=stored_filename,
                    UploadId=upload_id
                )
            except:
                pass
            return False


class StorageService:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            endpoint_url=settings.R2_ENDPOINT,
            aws_access_key_id=settings.R2_ACCESS_KEY,
            aws_secret_access_key=settings.R2_SECRET_KEY,
            region_name='auto'
        )
        self.bucket = settings.R2_BUCKET
        self.multipart_threshold = 100 * 1024 * 1024  # 100MB
    
    async def upload_file(self, file_data: bytes, stored_filename: str, content_type: str) -> bool:
        try:
            # Encrypt file data if encryption is available
            if file_encryption:
                file_data = file_encryption.encrypt_file(file_data, stored_filename)
            
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=stored_filename,
                Body=file_data,
                ContentType=content_type
            )
            return True
        except ClientError:
            return False
    
    def generate_presigned_upload_url(self, stored_filename: str, content_type: str, expires_in: int = 3600) -> str:
        try:
            url = self.s3_client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': self.bucket,
                    'Key': stored_filename,
                    'ContentType': content_type
                },
                ExpiresIn=expires_in
            )
            return url
        except ClientError:
            return None
    
    def generate_presigned_download_url(self, stored_filename: str, original_filename: str, expires_in: int = 3600) -> str:
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket,
                    'Key': stored_filename,
                    'ResponseContentDisposition': f'attachment; filename="{original_filename}"'
                },
                ExpiresIn=expires_in
            )
            return url
        except ClientError:
            return None
    
    async def delete_file(self, stored_filename: str) -> bool:
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket,
                Key=stored_filename
            )
            return True
        except ClientError:
            return False
    
    async def file_exists(self, stored_filename: str) -> bool:
        try:
            self.s3_client.head_object(
                Bucket=self.bucket,
                Key=stored_filename
            )
            return True
        except ClientError:
            return False
    
    async def download_file(self, stored_filename: str) -> Optional[bytes]:
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket,
                Key=stored_filename
            )
            file_data = response['Body'].read()
            
            # Decrypt file data if encryption is available
            if file_encryption:
                file_data = file_encryption.decrypt_file(file_data, stored_filename)
            
            return file_data
        except ClientError:
            return None
    
    async def initiate_multipart_upload(self, stored_filename: str, content_type: str) -> str:
        """Initiate a multipart upload and return upload ID"""
        try:
            response = self.s3_client.create_multipart_upload(
                Bucket=self.bucket,
                Key=stored_filename,
                ContentType=content_type
            )
            return response['UploadId']
        except ClientError:
            raise Exception("Failed to initiate multipart upload")
    
    async def generate_multipart_upload_url(self, stored_filename: str, upload_id: str, part_number: int, expires_in: int = 3600) -> str:
        """Generate presigned URL for uploading a part"""
        try:
            url = self.s3_client.generate_presigned_url(
                'upload_part',
                Params={
                    'Bucket': self.bucket,
                    'Key': stored_filename,
                    'UploadId': upload_id,
                    'PartNumber': part_number + 1  # R2 uses 1-based part numbers
                },
                ExpiresIn=expires_in
            )
            return url
        except ClientError:
            raise Exception("Failed to generate upload URL")
    
    async def complete_multipart_upload(self, stored_filename: str, upload_id: str, parts: list) -> bool:
        """Complete a multipart upload"""
        try:
            self.s3_client.complete_multipart_upload(
                Bucket=self.bucket,
                Key=stored_filename,
                UploadId=upload_id,
                MultipartUpload={'Parts': parts}
            )
            return True
        except ClientError:
            return False
    
    async def abort_multipart_upload(self, stored_filename: str, upload_id: str) -> bool:
        """Abort a multipart upload"""
        try:
            self.s3_client.abort_multipart_upload(
                Bucket=self.bucket,
                Key=stored_filename,
                UploadId=upload_id
            )
            return True
        except ClientError:
            return False


# Use mock storage for development
if settings.R2_ACCESS_KEY == "dummy_access_key":
    storage_service = MockStorageService()
else:
    storage_service = StorageService()