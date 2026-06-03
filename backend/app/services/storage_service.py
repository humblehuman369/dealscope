"""
Storage Service for managing file uploads (local and S3).
"""

import logging
import os
import shutil
import uuid
from abc import ABC, abstractmethod
from datetime import UTC, datetime
from pathlib import Path
from typing import BinaryIO

from app.core.config import settings

logger = logging.getLogger(__name__)


def _build_storage_key(filename: str, path_prefix: str = "") -> str:
    """Generate a unique, date-organized storage key shared by all backends."""
    ext = Path(filename).suffix
    unique_name = f"{uuid.uuid4().hex}{ext}"
    date_prefix = datetime.now(UTC).strftime("%Y/%m")
    if path_prefix:
        return f"{path_prefix}/{date_prefix}/{unique_name}"
    return f"{date_prefix}/{unique_name}"


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

    def __init__(self, base_path: str | None = None):
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
        date_prefix = datetime.now(UTC).strftime("%Y/%m")
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
        bucket_name: str | None = None,
        region: str | None = None,
        access_key: str | None = None,
        secret_key: str | None = None,
    ):
        try:
            import boto3
            from botocore.config import Config
        except ImportError:
            raise ImportError("boto3 is required for S3 storage. Install with: pip install boto3")

        self.bucket_name = bucket_name or os.getenv("AWS_S3_BUCKET") or settings.S3_BUCKET_NAME
        self.region = region or os.getenv("AWS_REGION") or settings.AWS_REGION

        if not self.bucket_name:
            raise ValueError("S3 bucket name is required")

        # Custom endpoint enables S3-compatible providers like Cloudflare R2.
        endpoint_url = os.getenv("S3_ENDPOINT_URL") or settings.S3_ENDPOINT_URL

        # Create S3 client
        self.client = boto3.client(
            "s3",
            region_name=self.region,
            aws_access_key_id=access_key or os.getenv("AWS_ACCESS_KEY_ID") or settings.AWS_ACCESS_KEY_ID or None,
            aws_secret_access_key=secret_key
            or os.getenv("AWS_SECRET_ACCESS_KEY")
            or settings.AWS_SECRET_ACCESS_KEY
            or None,
            endpoint_url=endpoint_url or None,
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
        date_prefix = datetime.now(UTC).strftime("%Y/%m")
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
            },
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


class PostgresStorage(StorageBackend):
    """
    Database-backed storage: file bytes live in the ``document_blobs`` table.

    Durable across redeploys without any external object store — a good fit
    for low-to-moderate document volume on hosts with ephemeral disks (e.g.
    Railway). Files are keyed by the same path-style key the local/S3 backends
    produce, so the rest of the app is unchanged. Migrate to S3/R2 if blob
    volume starts to dominate the database size.
    """

    async def upload(
        self,
        file: BinaryIO,
        filename: str,
        content_type: str,
        path_prefix: str = "",
    ) -> str:
        """Persist file bytes to the document_blobs table."""
        # Imported lazily to avoid a circular import at module load time
        # (storage_service is imported deep in the service/router chain).
        from app.db.session import get_session_factory
        from app.models.document import DocumentBlob

        key = _build_storage_key(filename, path_prefix)
        file.seek(0)
        data = file.read()

        async with get_session_factory()() as session:
            session.add(
                DocumentBlob(
                    storage_key=key,
                    data=data,
                    content_type=content_type,
                    byte_size=len(data),
                )
            )
            await session.commit()

        logger.info(f"Stored document blob in Postgres: {key} ({len(data)} bytes)")
        return key

    async def download(self, path: str) -> bytes:
        """Read file bytes back from the document_blobs table."""
        from sqlalchemy import select

        from app.db.session import get_session_factory
        from app.models.document import DocumentBlob

        async with get_session_factory()() as session:
            result = await session.execute(
                select(DocumentBlob.data).where(DocumentBlob.storage_key == path)
            )
            data = result.scalar_one_or_none()

        if data is None:
            raise FileNotFoundError(f"File not found: {path}")
        return bytes(data)

    async def delete(self, path: str) -> bool:
        """Delete the blob row. Returns True when a row was removed."""
        from sqlalchemy import delete as sa_delete

        from app.db.session import get_session_factory
        from app.models.document import DocumentBlob

        async with get_session_factory()() as session:
            result = await session.execute(
                sa_delete(DocumentBlob).where(DocumentBlob.storage_key == path)
            )
            await session.commit()

        deleted = (result.rowcount or 0) > 0
        if deleted:
            logger.info(f"Deleted document blob from Postgres: {path}")
        return deleted

    async def get_url(self, path: str, expires_in: int = 3600) -> str:
        """
        Return an API path; blobs are streamed via the documents endpoints
        (e.g. ``/api/v1/documents/{id}/view`` and ``/download``).
        """
        return f"/api/v1/documents/file/{path}"


def get_storage_backend() -> StorageBackend:
    """
    Factory function to get the configured storage backend.

    Selected by ``settings.STORAGE_BACKEND``:
    - ``postgres`` (aliases: ``database``, ``db``) → PostgresStorage
    - ``s3`` / ``r2`` → S3Storage (S3 or S3-compatible like Cloudflare R2)
    - ``local`` (default) → LocalStorage (development)

    Any backend that fails to initialize falls back to local storage so the
    app still boots; failures are logged.
    """
    backend = (settings.STORAGE_BACKEND or "local").strip().lower()

    if backend in {"postgres", "database", "db"}:
        return PostgresStorage()

    if backend in {"s3", "r2"}:
        try:
            return S3Storage()
        except Exception as e:
            logger.warning(f"Failed to initialize {backend} storage: {e}. Falling back to local.")

    return LocalStorage(settings.LOCAL_STORAGE_PATH)


# Singleton instance
storage = get_storage_backend()
