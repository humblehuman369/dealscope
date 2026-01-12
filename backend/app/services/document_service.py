"""
Document Service for managing user document uploads.
"""

import logging
from typing import Optional, List, BinaryIO
from datetime import datetime
from uuid import UUID

from sqlalchemy import select, func, desc, and_
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
        property_id: Optional[str] = None,
        description: Optional[str] = None,
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
        # Validate file type
        if content_type not in ALLOWED_TYPES:
            raise ValueError(f"File type {content_type} is not allowed")
        
        # Validate file size
        if file_size > MAX_FILE_SIZE:
            raise ValueError(f"File size exceeds maximum of {MAX_FILE_SIZE / 1024 / 1024:.0f} MB")
        
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
    ) -> Optional[Document]:
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
        property_id: Optional[str] = None,
        document_type: Optional[DocumentType] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Document]:
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
        property_id: Optional[str] = None,
    ) -> int:
        """Get count of user's documents."""
        query = select(func.count()).select_from(Document).where(
            Document.user_id == UUID(user_id)
        )
        
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
        description: Optional[str] = None,
        document_type: Optional[DocumentType] = None,
    ) -> Optional[Document]:
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

