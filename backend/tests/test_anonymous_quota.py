"""Anonymous daily quota — same property must not burn multiple slots."""

from app.routers.property import _address_fingerprint


def test_florida_and_fl_share_a_fingerprint():
    full = _address_fingerprint("5620 Teakwood Rd, Greenacres, Florida 33467")
    abbr = _address_fingerprint("5620 Teakwood Rd, Greenacres, FL 33467")
    assert full == abbr


def test_different_streets_do_not_share_a_fingerprint():
    a = _address_fingerprint("100 Main St, Miami, FL 33101")
    b = _address_fingerprint("200 Main St, Miami, FL 33101")
    assert a != b
