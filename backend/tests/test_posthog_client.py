"""The PostHog handle must work for modules that imported it before init."""

from unittest.mock import MagicMock, patch

import app.core.posthog_client as ph


def _reset():
    ph.posthog_client._bind(None)


def test_proxy_noops_before_init():
    _reset()
    assert ph.posthog_client is not None
    assert ph.posthog_client.enabled is False
    assert ph.posthog_client.capture(distinct_id="u1", event="x") is None


def test_early_import_sees_client_after_init():
    _reset()
    from app.core.posthog_client import posthog_client as early_ref  # bound before init

    fake = MagicMock()
    with patch.object(ph, "Posthog", return_value=fake) as ctor, \
         patch.object(ph, "_POSTHOG_AVAILABLE", True), \
         patch.object(ph.settings, "POSTHOG_DISABLED", False), \
         patch.object(ph.settings, "POSTHOG_PROJECT_TOKEN", "phc_test"):
        ph.init_posthog()

    # Key passed positionally (posthog>=6 has no `api_key` kwarg).
    assert ctor.call_args.args == ("phc_test",)
    assert "api_key" not in ctor.call_args.kwargs

    early_ref.capture(distinct_id="u1", event="signup")
    fake.capture.assert_called_once_with(distinct_id="u1", event="signup")
    _reset()


def test_real_sdk_accepts_constructor_args():
    ph.Posthog("phc_test", host="https://us.i.posthog.com",
               enable_exception_autocapture=False, debug=False, send=False).shutdown()
