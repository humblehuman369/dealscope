"""Post-OAuth destination: property URL in, never the homepage."""

from urllib.parse import quote

from app.routers.auth import _oauth_post_login_path, _safe_next_path


def test_safe_next_path_rejects_off_origin():
    assert _safe_next_path("/discovery?address=1+Oak") == "/discovery?address=1+Oak"
    assert _safe_next_path("https://evil.example/") is None
    assert _safe_next_path("//evil.example") is None
    assert _safe_next_path(None) is None


def test_new_oauth_user_goes_through_onboarding_with_property():
    dest = _oauth_post_login_path(created=True, next_path="/discovery?address=1+Oak")
    assert dest == f"/onboarding?next={quote('/discovery?address=1+Oak', safe='')}"


def test_returning_oauth_user_goes_to_property():
    assert (
        _oauth_post_login_path(created=False, next_path="/discovery?address=1+Oak")
        == "/discovery?address=1+Oak"
    )


def test_missing_next_falls_back_to_search_not_homepage():
    assert _oauth_post_login_path(created=False, next_path=None) == "/search"
    assert _oauth_post_login_path(created=True, next_path="//evil") == (
        f"/onboarding?next={quote('/search', safe='')}"
    )
