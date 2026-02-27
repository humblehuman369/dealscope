"""
Documents router for file upload and management.
"""

import logging
from io import BytesIO

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.deps import CurrentUser, DbSession
from app.models.document import DocumentType
from app.services.document_service import ALLOWED_TYPES, MAX_FILE_SIZE, document_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/documents", tags=["Documents"])


# ===========================================
# Schemas
# ===========================================


class DocumentResponse(BaseModel):
    """Schema for document response."""

    id: str
    user_id: str
    property_id: str | None = None
    document_type: str
    original_filename: str
    mime_type: str
    file_size: int
    description: str | None = None
    uploaded_at: str

    class Config:
        from_attributes = True


class DocumentList(BaseModel):
    """Paginated list of documents."""

    items: list[DocumentResponse]
    total: int
    limit: int
    offset: int


class DocumentUpdate(BaseModel):
    """Schema for updating document metadata."""

    description: str | None = None
    document_type: str | None = None


# ===========================================
# Endpoints
# ===========================================


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED, summary="Upload a document")
async def upload_document(
    current_user: CurrentUser,
    db: DbSession,
    file: UploadFile = File(...),
    document_type: str = Form("other"),
    property_id: str | None = Form(None),
    description: str | None = Form(None),
):
    """
    Upload a new document.

    Supported file types:
    - PDF documents
    - Images (JPEG, PNG, GIF, WebP)
    - Office documents (Excel, Word)
    - Text files (TXT, CSV)

    Maximum file size: 10 MB
    """
    # Validate file
    if not file.content_type:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not determine file type")

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file.content_type} is not allowed. Allowed types: {', '.join(ALLOWED_TYPES.values())}",
        )

    # Read file content to check size
    content = await file.read()
    file_size = len(content)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size ({file_size / 1024 / 1024:.1f} MB) exceeds maximum of {MAX_FILE_SIZE / 1024 / 1024:.0f} MB",
        )

    # Parse document type
    try:
        doc_type = DocumentType(document_type)
    except ValueError:
        doc_type = DocumentType.OTHER

    # Verify the user owns this property if property_id is provided
    if property_id:
        from uuid import UUID as _UUID

        from sqlalchemy import select

        from app.models.saved_property import SavedProperty

        result = await db.execute(
            select(SavedProperty.id).where(
                SavedProperty.id == _UUID(property_id),
                SavedProperty.user_id == current_user.id,
            )
        )
        if result.scalar_one_or_none() is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this property")

    # Upload
    try:
        document = await document_service.upload_document(
            db=db,
            user_id=str(current_user.id),
            file=BytesIO(content),
            filename=file.filename or "unnamed",
            content_type=file.content_type,
            file_size=file_size,
            document_type=doc_type,
            property_id=property_id,
            description=description,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to upload document")

    return DocumentResponse(
        id=str(document.id),
        user_id=str(document.user_id),
        property_id=str(document.property_id) if document.property_id else None,
        document_type=document.document_type.value,
        original_filename=document.original_filename,
        mime_type=document.mime_type,
        file_size=document.file_size,
        description=document.description,
        uploaded_at=document.uploaded_at.isoformat(),
    )


@router.get("", response_model=DocumentList, summary="List user documents")
async def list_documents(
    current_user: CurrentUser,
    db: DbSession,
    property_id: str | None = Query(None, description="Filter by property"),
    document_type: str | None = Query(None, description="Filter by type"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """
    List all documents for the current user.

    Optionally filter by property or document type.
    """
    doc_type = None
    if document_type:
        try:
            doc_type = DocumentType(document_type)
        except ValueError:
            pass

    documents = await document_service.list_user_documents(
        db=db,
        user_id=str(current_user.id),
        property_id=property_id,
        document_type=doc_type,
        limit=limit,
        offset=offset,
    )

    total = await document_service.get_document_count(
        db=db,
        user_id=str(current_user.id),
        property_id=property_id,
    )

    items = [
        DocumentResponse(
            id=str(doc.id),
            user_id=str(doc.user_id),
            property_id=str(doc.property_id) if doc.property_id else None,
            document_type=doc.document_type.value,
            original_filename=doc.original_filename,
            mime_type=doc.mime_type,
            file_size=doc.file_size,
            description=doc.description,
            uploaded_at=doc.uploaded_at.isoformat(),
        )
        for doc in documents
    ]

    return DocumentList(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{document_id}", response_model=DocumentResponse, summary="Get document details")
async def get_document(
    document_id: str,
    current_user: CurrentUser,
    db: DbSession,
):
    """Get details for a specific document."""
    document = await document_service.get_by_id(
        db=db,
        document_id=document_id,
        user_id=str(current_user.id),
    )

    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    return DocumentResponse(
        id=str(document.id),
        user_id=str(document.user_id),
        property_id=str(document.property_id) if document.property_id else None,
        document_type=document.document_type.value,
        original_filename=document.original_filename,
        mime_type=document.mime_type,
        file_size=document.file_size,
        description=document.description,
        uploaded_at=document.uploaded_at.isoformat(),
    )


@router.get("/{document_id}/download", summary="Download a document")
async def download_document(
    document_id: str,
    current_user: CurrentUser,
    db: DbSession,
):
    """Download the document file."""
    try:
        file_bytes, filename, mime_type = await document_service.download_document(
            db=db,
            document_id=document_id,
            user_id=str(current_user.id),
        )
    except FileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    return StreamingResponse(
        BytesIO(file_bytes), media_type=mime_type, headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/{document_id}/url", summary="Get document access URL")
async def get_document_url(
    document_id: str,
    current_user: CurrentUser,
    db: DbSession,
    expires_in: int = Query(3600, ge=60, le=86400, description="URL expiration in seconds"),
):
    """
    Get a temporary URL to access the document.

    For S3 storage, this returns a presigned URL.
    For local storage, this returns an API path.
    """
    try:
        url = await document_service.get_document_url(
            db=db,
            document_id=document_id,
            user_id=str(current_user.id),
            expires_in=expires_in,
        )
    except FileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    return {"url": url, "expires_in": expires_in}


@router.patch("/{document_id}", response_model=DocumentResponse, summary="Update document metadata")
async def update_document(
    document_id: str,
    update_data: DocumentUpdate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Update document description or type."""
    doc_type = None
    if update_data.document_type:
        try:
            doc_type = DocumentType(update_data.document_type)
        except ValueError:
            pass

    document = await document_service.update_document(
        db=db,
        document_id=document_id,
        user_id=str(current_user.id),
        description=update_data.description,
        document_type=doc_type,
    )

    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    return DocumentResponse(
        id=str(document.id),
        user_id=str(document.user_id),
        property_id=str(document.property_id) if document.property_id else None,
        document_type=document.document_type.value,
        original_filename=document.original_filename,
        mime_type=document.mime_type,
        file_size=document.file_size,
        description=document.description,
        uploaded_at=document.uploaded_at.isoformat(),
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a document")
async def delete_document(
    document_id: str,
    current_user: CurrentUser,
    db: DbSession,
):
    """Delete a document and its stored file."""
    deleted = await document_service.delete_document(
        db=db,
        document_id=document_id,
        user_id=str(current_user.id),
    )

    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")


# ===========================================
# Info Endpoints
# ===========================================


@router.get("/info/types", summary="Get allowed file types")
async def get_allowed_types():
    """Get list of allowed file types and maximum size."""
    return {
        "allowed_types": list(ALLOWED_TYPES.keys()),
        "allowed_extensions": list(set(ALLOWED_TYPES.values())),
        "max_file_size_bytes": MAX_FILE_SIZE,
        "max_file_size_mb": MAX_FILE_SIZE / 1024 / 1024,
        "document_types": [t.value for t in DocumentType],
    }
