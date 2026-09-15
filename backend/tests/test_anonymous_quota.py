"""Anonymous daily quota — visitor cookie primary, IP only as abuse cap."""

import inspect

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.core.config import settings
from app.routers.property import (
    _address_fingerprint,
    _anon_visitor_id,
    _check_anonymous_quota,
    _record_anonymous_analysis,
)


def test_florida_and_fl_share_a_fingerprint():
    full = _address_fingerprint("5620 Teakwood Rd, Greenacres, Florida 33467")
    abbr = _address_fingerprint("5620 Teakwood Rd, Greenacres, FL 33467")
    assert full == abbr


def test_different_streets_do_not_share_a_fingerprint():
    a = _address_fingerprint("100 Main St, Miami, FL 33101")
    b = _address_fingerprint("200 Main St, Miami, FL 33101")
    assert a != b


class _MemoryCache:
    def __init__(self) -> None:
        self.store: dict[str, object] = {}

    async def get(self, key: str):
        return self.store.get(key)

    async def set(self, key: str, value, ttl_seconds: int = 0):
        self.store[key] = value
        return True

    async def exists(self, key: str) -> bool:
        return key in self.store

    async def set_if_not_exists(self, key: str, value, ttl_seconds: int = 0) -> bool:
        if key in self.store:
            return False
        self.store[key] = value
        return True


def _request(*, ip: str = "203.0.113.10", visitor: str | None = "a" * 32) -> Request:
    headers: list[tuple[bytes, bytes]] = [(b"x-forwarded-for", ip.encode())]
    if visitor:
        headers.append((b"cookie", f"{settings.ANON_VISITOR_COOKIE}={visitor}".encode()))
    return Request(
        {
            "type": "http",
            "asgi": {"spec_version": "2.3", "version": "3.0"},
            "http_version": "1.1",
            "method": "POST",
            "scheme": "http",
            "path": "/api/v1/properties/search",
            "raw_path": b"/api/v1/properties/search",
            "query_string": b"",
            "headers": headers,
            "client": (ip, 12345),
            "server": ("test", 80),
        }
    )


@pytest.fixture
def cache(monkeypatch):
    memory = _MemoryCache()
    monkeypatch.setattr("app.routers.property.get_cache_service", lambda: memory)
    return memory


def test_anon_visitor_id_reads_valid_cookie():
    vid = "ab" * 16
    assert _anon_visitor_id(_request(visitor=vid)) == vid


def test_anon_visitor_id_rejects_garbage_and_mints_new():
    minted = _anon_visitor_id(_request(visitor="not-a-uuid"))
    assert len(minted) == 32
    assert minted != "not-a-uuid"


@pytest.mark.asyncio
async def test_two_visitors_on_one_ip_each_get_their_own_quota(cache):
    ip = "198.51.100.7"
    a = "1" * 32
    b = "2" * 32
    addresses = [
        "100 Main St, Miami, FL 33101",
        "200 Main St, Miami, FL 33101",
        "300 Main St, Miami, FL 33101",
    ]
    for addr in addresses:
        keys = await _check_anonymous_quota(_request(ip=ip, visitor=a), addr)
        assert keys[3] is False
        await _record_anonymous_analysis(*keys[:3])

    with pytest.raises(HTTPException) as gated:
        await _check_anonymous_quota(_request(ip=ip, visitor=a), "400 Main St, Miami, FL 33101")
    assert gated.value.status_code == 403
    assert gated.value.detail["limit_type"] == "anonymous_analyses"

    fourth = await _check_anonymous_quota(_request(ip=ip, visitor=b), "500 Main St, Miami, FL 33101")
    assert fourth[3] is False


@pytest.mark.asyncio
async def test_one_visitor_past_limit_is_gated(cache):
    visitor = "c" * 32
    for i in range(settings.ANON_ANALYSES_PER_DAY):
        keys = await _check_anonymous_quota(
            _request(visitor=visitor), f"{100 + i} Oak St, Miami, FL 33101"
        )
        await _record_anonymous_analysis(*keys[:3])

    with pytest.raises(HTTPException) as gated:
        await _check_anonymous_quota(_request(visitor=visitor), "999 Oak St, Miami, FL 33101")
    assert gated.value.status_code == 403
    assert gated.value.detail["code"] == "ANONYMOUS_LIMIT_REACHED"


@pytest.mark.asyncio
async def test_repeat_view_does_not_consume_quota(cache):
    visitor = "d" * 32
    addr = "7026 NW 21st Ave, Miami, FL 33147"
    first = await _check_anonymous_quota(_request(visitor=visitor), addr)
    await _record_anonymous_analysis(*first[:3])
    again = await _check_anonymous_quota(_request(visitor=visitor), addr)
    assert again[3] is True


@pytest.mark.asyncio
async def test_ip_cap_trips_at_its_number(cache, monkeypatch):
    monkeypatch.setattr(settings, "ANON_IP_CAP_PER_DAY", 2)
    ip = "192.0.2.44"
    first = await _check_anonymous_quota(_request(ip=ip, visitor="e" * 32), "1 Pine St, Miami, FL 33101")
    await _record_anonymous_analysis(*first[:3])
    second = await _check_anonymous_quota(
        _request(ip=ip, visitor="f" * 32), "2 Pine St, Miami, FL 33101"
    )
    await _record_anonymous_analysis(*second[:3])

    with pytest.raises(HTTPException) as gated:
        await _check_anonymous_quota(_request(ip=ip, visitor="0" * 32), "3 Pine St, Miami, FL 33101")
    assert gated.value.status_code == 403
    assert gated.value.detail["limit_type"] == "anonymous_ip_cap"
    assert gated.value.detail["limit"] == 2


def test_signed_in_path_never_calls_anonymous_quota():
    """Guard: search_property only calls the anon check in the else of current_user."""
    from app.routers import property as property_mod

    src = inspect.getsource(property_mod.search_property)
    assert "if current_user:" in src
    assert "_check_anonymous_quota" in src
    assert src.index("if current_user:") < src.index("_check_anonymous_quota")
