"""
Audit log repository – write-heavy, append-only log of security events.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


class AuditRepository:
    """Encapsulates all AuditLog queries."""

    async def log(
        self,
        db: AsyncSession,
        *,
        action: str,
        user_id: Optional[uuid.UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> AuditLog:
        entry = AuditLog(
            user_id=user_id,
            action=action,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata_=metadata or {},
        )
        db.add(entry)
        await db.flush()
        return entry

    async def list_for_user(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        *,
        limit: int = 50,
        offset: int = 0,
    ) -> List[AuditLog]:
        result = await db.execute(
            select(AuditLog)
            .where(AuditLog.user_id == user_id)
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def delete_older_than(self, db: AsyncSession, days: int = 90) -> int:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        result = await db.execute(
            delete(AuditLog).where(AuditLog.created_at < cutoff)
        )
        return result.rowcount  # type: ignore[return-value]


# Module-level singleton
audit_repo = AuditRepository()
