"""
Tests for SavedPropertyService — CRUD, ownership isolation, and bulk operations.
"""

import pytest
import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.saved_property import SavedProperty
from app.models.saved_property import PropertyStatus as ModelPropertyStatus
from app.schemas.saved_property import SavedPropertyCreate, SavedPropertyUpdate, PropertyStatus
from app.services.saved_property_service import SavedPropertyService, saved_property_service


pytestmark = pytest.mark.asyncio


# ------------------------------------------------------------------
# Fixtures
# ------------------------------------------------------------------

@pytest.fixture
def service() -> SavedPropertyService:
    return saved_property_service


@pytest.fixture
def sample_property_data() -> dict:
    return {
        "external_property_id": "prop-abc-123",
        "address_street": "123 Test St",
        "address_city": "Testville",
        "address_state": "FL",
        "address_zip": "33000",
        "full_address": "123 Test St, Testville, FL 33000",
        "property_data_snapshot": {"price": 350000, "beds": 3, "baths": 2},
    }


async def _create_property(
    db: AsyncSession,
    service: SavedPropertyService,
    user_id: str,
    data_overrides: dict | None = None,
) -> SavedProperty:
    """Helper to create a saved property."""
    defaults = {
        "external_property_id": f"prop-{uuid.uuid4().hex[:8]}",
        "address_street": "123 Test St",
        "address_city": "Testville",
        "address_state": "FL",
        "address_zip": "33000",
        "full_address": "123 Test St, Testville, FL 33000",
        "property_data_snapshot": {"price": 350000},
    }
    if data_overrides:
        defaults.update(data_overrides)
    create_data = SavedPropertyCreate(**defaults)
    return await service.save_property(db, user_id, create_data)


# ------------------------------------------------------------------
# Create
# ------------------------------------------------------------------

class TestCreateProperty:
    async def test_save_property_success(
        self, db_session, created_user, service, sample_property_data
    ):
        create_data = SavedPropertyCreate(**sample_property_data)
        saved = await service.save_property(db_session, str(created_user.id), create_data)

        assert saved is not None
        assert saved.address_street == sample_property_data["address_street"]
        assert saved.user_id == created_user.id
        assert saved.status.value == PropertyStatus.WATCHING.value

    async def test_save_duplicate_raises(
        self, db_session, created_user, service, sample_property_data
    ):
        create_data = SavedPropertyCreate(**sample_property_data)
        await service.save_property(db_session, str(created_user.id), create_data)

        with pytest.raises(ValueError, match="already in your saved list"):
            await service.save_property(db_session, str(created_user.id), create_data)


# ------------------------------------------------------------------
# Read
# ------------------------------------------------------------------

class TestReadProperty:
    async def test_get_by_id(self, db_session, created_user, service):
        saved = await _create_property(db_session, service, str(created_user.id))
        fetched = await service.get_by_id(db_session, str(saved.id), str(created_user.id))
        assert fetched is not None
        assert fetched.id == saved.id

    async def test_get_by_id_wrong_user(self, db_session, created_user, service):
        saved = await _create_property(db_session, service, str(created_user.id))
        # Random user should not see this
        other_user_id = str(uuid.uuid4())
        fetched = await service.get_by_id(db_session, str(saved.id), other_user_id)
        assert fetched is None

    async def test_list_properties(self, db_session, created_user, service):
        for i in range(3):
            await _create_property(
                db_session, service, str(created_user.id),
                {"address_street": f"{i} Main St", "external_property_id": f"prop-{i}"},
            )

        props = await service.list_properties(db_session, str(created_user.id))
        assert len(props) == 3

    async def test_list_properties_isolation(self, db_session, created_user, service):
        """User A cannot see User B's properties."""
        await _create_property(db_session, service, str(created_user.id))

        other_user_id = str(uuid.uuid4())
        other_props = await service.list_properties(db_session, other_user_id)
        assert len(other_props) == 0

    async def test_list_with_status_filter(self, db_session, created_user, service):
        saved = await _create_property(db_session, service, str(created_user.id))
        await service.update_status(
            db_session, str(saved.id), str(created_user.id), ModelPropertyStatus.ARCHIVED
        )

        watching = await service.list_properties(
            db_session, str(created_user.id), status=ModelPropertyStatus.WATCHING
        )
        archived = await service.list_properties(
            db_session, str(created_user.id), status=ModelPropertyStatus.ARCHIVED
        )
        assert len(watching) == 0
        assert len(archived) == 1

    async def test_count_properties(self, db_session, created_user, service):
        for i in range(2):
            await _create_property(
                db_session, service, str(created_user.id),
                {"external_property_id": f"cnt-{i}", "address_street": f"{i} Count St"},
            )
        count = await service.count_properties(db_session, str(created_user.id))
        assert count == 2


# ------------------------------------------------------------------
# Update
# ------------------------------------------------------------------

class TestUpdateProperty:
    async def test_update_nickname(self, db_session, created_user, service):
        saved = await _create_property(db_session, service, str(created_user.id))

        updated = await service.update_property(
            db_session, str(saved.id), str(created_user.id),
            SavedPropertyUpdate(nickname="My Dream House"),
        )
        assert updated is not None
        assert updated.nickname == "My Dream House"

    async def test_update_wrong_user(self, db_session, created_user, service):
        saved = await _create_property(db_session, service, str(created_user.id))
        result = await service.update_property(
            db_session, str(saved.id), str(uuid.uuid4()),
            SavedPropertyUpdate(nickname="Hacked"),
        )
        assert result is None

    async def test_bulk_update_status(self, db_session, created_user, service):
        ids = []
        for i in range(3):
            s = await _create_property(
                db_session, service, str(created_user.id),
                {"external_property_id": f"bulk-{i}", "address_street": f"{i} Bulk St"},
            )
            ids.append(str(s.id))

        count = await service.bulk_update_status(
            db_session, str(created_user.id), ids, ModelPropertyStatus.UNDER_CONTRACT
        )
        assert count == 3


# ------------------------------------------------------------------
# Delete
# ------------------------------------------------------------------

class TestDeleteProperty:
    async def test_delete_property(self, db_session, created_user, service):
        saved = await _create_property(db_session, service, str(created_user.id))
        deleted = await service.delete_property(
            db_session, str(saved.id), str(created_user.id)
        )
        assert deleted is True

        fetched = await service.get_by_id(db_session, str(saved.id), str(created_user.id))
        assert fetched is None

    async def test_delete_wrong_user(self, db_session, created_user, service):
        saved = await _create_property(db_session, service, str(created_user.id))
        deleted = await service.delete_property(
            db_session, str(saved.id), str(uuid.uuid4())
        )
        assert deleted is False

    async def test_bulk_delete(self, db_session, created_user, service):
        ids = []
        for i in range(3):
            s = await _create_property(
                db_session, service, str(created_user.id),
                {"external_property_id": f"bdel-{i}", "address_street": f"{i} Del St"},
            )
            ids.append(str(s.id))

        count = await service.bulk_delete(db_session, str(created_user.id), ids)
        assert count == 3

        remaining = await service.list_properties(db_session, str(created_user.id))
        assert len(remaining) == 0
