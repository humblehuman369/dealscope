"""
Storage Service for managing file uploads (local and S3).
"""

import logging
import os
import shutil
from abc import ABC, abstractmethod
from typing import Optional, BinaryIO
from datetime import datetime
from pathlib import Path
import uuid

from app.core.config import settings

logger = logging.getLogger(__name__)


class StorageBackend(ABC):
    """Abstract base class for storage backends."""
    
    @abstractmethod
    async def upload(
        self,
        file: BinaryIO,
        filename: str,
        content_type: str,
        path_prefix: str = "",
    ) -> str:
        """Upload a file and return the storage URL/path."""
        pass
    
    @abstractmethod
    async def download(self, path: str) -> bytes:
        """Download a file by path."""
        pass
    
    @abstractmethod
    async def delete(self, path: str) -> bool:
        """Delete a file by path."""
        pass
    
    @abstractmethod
    async def get_url(self, path: str, expires_in: int = 3600) -> str:
        """Get a URL to access the file."""
        pass


class LocalStorage(StorageBackend):
    """
    Local filesystem storage backend.
    
    Good for development and small deployments.
    Files are stored in the 'uploads' directory.
    """
    
    def __init__(self, base_path: str = None):
        self.base_path = Path(base_path or os.getenv("UPLOAD_DIR", "./uploads"))
        self.base_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"Local storage initialized at {self.base_path}")
    
    def _resolve_path(self, path: str) -> Path:
        """Resolve and validate the path is within base_path."""
        full_path = (self.base_path / path).resolve()
        # Security: Ensure path is within base directory
        if not str(full_path).startswith(str(self.base_path.resolve())):
            raise ValueError("Invalid path - attempted path traversal")
        return full_path
    
    async def upload(
        self,
        file: BinaryIO,
        filename: str,
        content_type: str,
        path_prefix: str = "",
    ) -> str:
        """Upload file to local filesystem."""
        # Generate unique filename to prevent overwrites
        ext = Path(filename).suffix
        unique_name = f"{uuid.uuid4().hex}{ext}"
        
        # Build path with date-based organization
        date_prefix = datetime.utcnow().strftime("%Y/%m")
        if path_prefix:
            full_prefix = f"{path_prefix}/{date_prefix}"
        else:
            full_prefix = date_prefix
        
        relative_path = f"{full_prefix}/{unique_name}"
        full_path = self._resolve_path(relative_path)
        
        # Create directory structure
        full_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write file
        file.seek(0)
        with open(full_path, "wb") as f:
            shutil.copyfileobj(file, f)
        
        logger.info(f"Uploaded file to {relative_path}")
        return relative_path
    
    async def download(self, path: str) -> bytes:
        """Download file from local filesystem."""
        full_path = self._resolve_path(path)
        
        if not full_path.exists():
            raise FileNotFoundError(f"File not found: {path}")
        
        with open(full_path, "rb") as f:
            return f.read()
    
    async def delete(self, path: str) -> bool:
        """Delete file from local filesystem."""
        try:
            full_path = self._resolve_path(path)
            
            if full_path.exists():
                full_path.unlink()
                logger.info(f"Deleted file: {path}")
                return True
            
            return False
        except Exception as e:
            logger.error(f"Failed to delete {path}: {e}")
            return False
    
    async def get_url(self, path: str, expires_in: int = 3600) -> str:
        """
        Get URL to access the file.
        
        For local storage, returns a path relative to the API.
        The API should serve files from /uploads/.
        """
        # Return a URL path that can be served by the API
        return f"/api/v1/documents/file/{path}"


class S3Storage(StorageBackend):
    """
    AWS S3 storage backend.
    
    Production-ready storage with presigned URLs.
    """
    
    def __init__(
        self,
        bucket_name: str = None,
        region: str = None,
        access_key: str = None,
        secret_key: str = None,
    ):
        try:
            import boto3
            from botocore.config import Config
        except ImportError:
            raise ImportError("boto3 is required for S3 storage. Install with: pip install boto3")
        
        self.bucket_name = bucket_name or os.getenv("AWS_S3_BUCKET")
        self.region = region or os.getenv("AWS_REGION", "us-east-1")
        
        if not self.bucket_name:
            raise ValueError("S3 bucket name is required")
        
        # Create S3 client
        self.client = boto3.client(
            "s3",
            region_name=self.region,
            aws_access_key_id=access_key or os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=secret_key or os.getenv("AWS_SECRET_ACCESS_KEY"),
            config=Config(signature_version="s3v4"),
        )
        
        logger.info(f"S3 storage initialized for bucket: {self.bucket_name}")
    
    async def upload(
        self,
        file: BinaryIO,
        filename: str,
        content_type: str,
        path_prefix: str = "",
    ) -> str:
        """Upload file to S3."""
        # Generate unique key
        ext = Path(filename).suffix
        unique_name = f"{uuid.uuid4().hex}{ext}"
        
        # Build key with date-based organization
        date_prefix = datetime.utcnow().strftime("%Y/%m")
        if path_prefix:
            key = f"{path_prefix}/{date_prefix}/{unique_name}"
        else:
            key = f"{date_prefix}/{unique_name}"
        
        # Upload to S3
        file.seek(0)
        self.client.upload_fileobj(
            file,
            self.bucket_name,
            key,
            ExtraArgs={
                "ContentType": content_type,
            }
        )
        
        logger.info(f"Uploaded file to s3://{self.bucket_name}/{key}")
        return key
    
    async def download(self, path: str) -> bytes:
        """Download file from S3."""
        from io import BytesIO
        
        buffer = BytesIO()
        self.client.download_fileobj(self.bucket_name, path, buffer)
        buffer.seek(0)
        return buffer.read()
    
    async def delete(self, path: str) -> bool:
        """Delete file from S3."""
        try:
            self.client.delete_object(Bucket=self.bucket_name, Key=path)
            logger.info(f"Deleted file from S3: {path}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete from S3 {path}: {e}")
            return False
    
    async def get_url(self, path: str, expires_in: int = 3600) -> str:
        """Get presigned URL to access the file."""
        url = self.client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": self.bucket_name,
                "Key": path,
            },
            ExpiresIn=expires_in,
        )
        return url


def get_storage_backend() -> StorageBackend:
    """
    Factory function to get the configured storage backend.
    
    Uses S3 if AWS_S3_BUCKET is configured, otherwise local storage.
    """
    if os.getenv("AWS_S3_BUCKET"):
        try:
            return S3Storage()
        except Exception as e:
            logger.warning(f"Failed to initialize S3 storage: {e}. Falling back to local.")
    
    return LocalStorage()


# Singleton instance
storage = get_storage_backend()

