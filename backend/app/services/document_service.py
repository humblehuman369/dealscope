"""
Document Service for managing user document uploads.

File upload security:
- Validates MIME type against allowlist
- Validates file magic bytes match declared content type
- Enforces file size limits
"""

import logging
from typing import BinaryIO
from uuid import UUID

from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document, DocumentType
from app.services.storage_service import storage

logger = logging.getLogger(__name__)

# Allowed file types and their MIME mappings
ALLOWED_TYPES = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/msword": ".doc",
    "text/plain": ".txt",
    "text/csv": ".csv",
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

# ──────────────────────────────────────────────
# Magic-byte signatures for file type validation
# ──────────────────────────────────────────────
# Maps expected content-type to (offset, magic_bytes) tuples.
# We read the first few bytes of the upload and verify they match
# the declared MIME type, preventing renamed-executable attacks.

_MAGIC_SIGNATURES: dict[str, list[bytes]] = {
    "application/pdf": [b"%PDF"],
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "image/gif": [b"GIF87a", b"GIF89a"],
    "image/webp": [b"RIFF"],  # RIFF....WEBP
    # ZIP-based Office formats (xlsx, docx) share PK signature
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [b"PK\x03\x04"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [b"PK\x03\x04"],
    # Legacy Office formats use OLE2 compound file signature
    "application/vnd.ms-excel": [b"\xd0\xcf\x11\xe0"],
    "application/msword": [b"\xd0\xcf\x11\xe0"],
}


def _validate_magic_bytes(file: BinaryIO, declared_content_type: str) -> bool:
    """Check that the file's leading bytes match the declared MIME type.

    Returns True if the content type has no known signature (text/plain,
    text/csv) or if the magic bytes match.  Returns False on mismatch.
    The file's read position is restored after checking.
    """
    signatures = _MAGIC_SIGNATURES.get(declared_content_type)
    if signatures is None:
        # No signature defined for this type (e.g. text/plain) — allow
        return True

    pos = file.tell()
    try:
        header = file.read(16)
        if not header:
            return False
        return any(header.startswith(sig) for sig in signatures)
    finally:
        file.seek(pos)


class DocumentService:
    """Service for managing document uploads."""

    async def upload_document(
        self,
        db: AsyncSession,
        user_id: str,
        file: BinaryIO,
        filename: str,
        content_type: str,
        file_size: int,
        document_type: DocumentType = DocumentType.OTHER,
        property_id: str | None = None,
        description: str | None = None,
    ) -> Document:
        """
        Upload a document and create a database record.

        Args:
            db: Database session
            user_id: ID of the user uploading
            file: File-like object
            filename: Original filename
            content_type: MIME type
            file_size: Size in bytes
            document_type: Type category
            property_id: Optional linked property ID
            description: Optional description

        Returns:
            Created Document record
        """
        # Validate declared MIME type against allowlist
        if content_type not in ALLOWED_TYPES:
            raise ValueError(f"File type {content_type} is not allowed")

        # Validate file size
        if file_size > MAX_FILE_SIZE:
            raise ValueError(f"File size exceeds maximum of {MAX_FILE_SIZE / 1024 / 1024:.0f} MB")

        # Validate magic bytes match declared content type
        # Prevents renamed-executable attacks (e.g. malware.exe → report.pdf)
        if not _validate_magic_bytes(file, content_type):
            logger.warning(
                "Magic-byte mismatch: declared=%s filename=%s user=%s",
                content_type,
                filename,
                user_id,
            )
            raise ValueError(
                f"File content does not match declared type {content_type}. "
                "The file may be corrupted or incorrectly named."
            )

        # Upload to storage
        path_prefix = f"documents/{user_id}"
        storage_path = await storage.upload(
            file=file,
            filename=filename,
            content_type=content_type,
            path_prefix=path_prefix,
        )

        # Create database record
        document = Document(
            user_id=UUID(user_id),
            property_id=UUID(property_id) if property_id else None,
            document_type=document_type,
            original_filename=filename,
            storage_path=storage_path,
            mime_type=content_type,
            file_size=file_size,
            description=description,
        )

        db.add(document)
        await db.commit()
        await db.refresh(document)

        logger.info(f"Document uploaded: {document.id} for user {user_id}")

        return document

    async def get_by_id(
        self,
        db: AsyncSession,
        document_id: str,
        user_id: str,
    ) -> Document | None:
        """Get a document by ID, ensuring user ownership."""
        query = select(Document).where(
            and_(
                Document.id == UUID(document_id),
                Document.user_id == UUID(user_id),
            )
        )

        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def list_user_documents(
        self,
        db: AsyncSession,
        user_id: str,
        property_id: str | None = None,
        document_type: DocumentType | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Document]:
        """
        List documents for a user.

        Args:
            db: Database session
            user_id: User ID
            property_id: Optional filter by property
            document_type: Optional filter by type
            limit: Max results
            offset: Pagination offset
        """
        query = select(Document).where(Document.user_id == UUID(user_id))

        if property_id:
            query = query.where(Document.property_id == UUID(property_id))

        if document_type:
            query = query.where(Document.document_type == document_type)

        query = query.order_by(desc(Document.uploaded_at))
        query = query.limit(limit).offset(offset)

        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_document_count(
        self,
        db: AsyncSession,
        user_id: str,
        property_id: str | None = None,
    ) -> int:
        """Get count of user's documents."""
        query = select(func.count()).select_from(Document).where(Document.user_id == UUID(user_id))

        if property_id:
            query = query.where(Document.property_id == UUID(property_id))

        result = await db.execute(query)
        return result.scalar() or 0

    async def download_document(
        self,
        db: AsyncSession,
        document_id: str,
        user_id: str,
    ) -> tuple[bytes, str, str]:
        """
        Download a document.

        Returns: (file_bytes, filename, mime_type)
        """
        document = await self.get_by_id(db, document_id, user_id)

        if not document:
            raise FileNotFoundError("Document not found")

        # Download from storage
        file_bytes = await storage.download(document.storage_path)

        return file_bytes, document.original_filename, document.mime_type

    async def get_document_url(
        self,
        db: AsyncSession,
        document_id: str,
        user_id: str,
        expires_in: int = 3600,
    ) -> str:
        """Get a URL to access the document."""
        document = await self.get_by_id(db, document_id, user_id)

        if not document:
            raise FileNotFoundError("Document not found")

        return await storage.get_url(document.storage_path, expires_in)

    async def delete_document(
        self,
        db: AsyncSession,
        document_id: str,
        user_id: str,
    ) -> bool:
        """Delete a document and its storage file."""
        document = await self.get_by_id(db, document_id, user_id)

        if not document:
            return False

        # Delete from storage
        await storage.delete(document.storage_path)

        # Delete from database
        await db.delete(document)
        await db.commit()

        logger.info(f"Document deleted: {document_id}")

        return True

    async def update_document(
        self,
        db: AsyncSession,
        document_id: str,
        user_id: str,
        description: str | None = None,
        document_type: DocumentType | None = None,
    ) -> Document | None:
        """Update document metadata."""
        document = await self.get_by_id(db, document_id, user_id)

        if not document:
            return None

        if description is not None:
            document.description = description

        if document_type is not None:
            document.document_type = document_type

        await db.commit()
        await db.refresh(document)

        return document


# Singleton instance
document_service = DocumentService()
