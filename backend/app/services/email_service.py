"""
Email Service for sending transactional emails via Resend.

Visual design follows the DealGapIQ dark theme — palette mirrors
``frontend/src/app/globals.css``.  All templates use a single dark
``color-scheme`` with explicit colors and meta tags so Apple Mail,
Gmail, and Outlook do not auto-invert cards into muddy hues.
"""

import asyncio
import hashlib
import hmac
import html as html_lib
import logging
import re
from datetime import datetime
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    import resend

    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False
    logger.warning("Resend not installed. Email functionality will be disabled.")


class EmailService:
    """Send transactional emails via Resend with the DealGapIQ dark theme.

    All ``send_*`` methods return ``{"success": bool, "id"|"error": str}``
    so callers can surface failures to users instead of silently dropping
    them.  Falls back to logging in development when no API key is set.
    """

    # =================================================================
    # Brand palette (mirror of frontend/src/app/globals.css :root)
    # =================================================================
    # Page chrome
    PAGE_BG = "#0B1120"
    CARD_BG = "#0D1424"
    NESTED_BG = "#0F172A"
    BORDER = "rgba(148, 163, 184, 0.12)"
    DIVIDER = "#1E293B"

    # Brand
    BRAND_FROM = "#0465F2"
    BRAND_TO = "#0FA4E9"
    BRAND_GRADIENT = "linear-gradient(135deg, #0465F2 0%, #0FA4E9 100%)"
    BRAND_LINK = "#38BDF8"

    # Text
    TXT_HEADING = "#F1F5F9"
    TXT_BODY = "#CBD5E1"
    TXT_SECONDARY = "#94A3B8"
    TXT_MUTED = "#64748B"
    TXT_DIM = "#475569"

    # Semantic — info (blue/sky)
    INFO_BG = "#0A1929"
    INFO_BORDER = "#0FA4E9"
    INFO_HEADING = "#BAE6FD"
    INFO_BODY = "#CBD5E1"

    # Semantic — success (green)
    SUCCESS_BG = "#0A1F0F"
    SUCCESS_BORDER = "#22C55E"
    SUCCESS_HEADING = "#BBF7D0"
    SUCCESS_BODY = "#86EFAC"

    # Semantic — warning (amber)
    WARN_BG = "#1A1408"
    WARN_BORDER = "#F59E0B"
    WARN_HEADING = "#FCD34D"
    WARN_BODY = "#FDE68A"
    WARN_LINK = "#FBBF24"

    # Semantic — danger (red)
    DANGER_BG = "#1F0A0A"
    DANGER_BORDER = "#EF4444"
    DANGER_HEADING = "#FCA5A5"
    DANGER_BODY = "#FECACA"
    DANGER_LINK = "#F87171"
    DANGER_BUTTON_FROM = "#EF4444"
    DANGER_BUTTON_TO = "#DC2626"

    # Feature card variants (welcome series)
    FEAT_BLUE_BG = "#0A1929"
    FEAT_BLUE_BORDER = "#0FA4E9"
    FEAT_PURPLE_BG = "#170E29"
    FEAT_PURPLE_BORDER = "#A78BFA"
    FEAT_ORANGE_BG = "#1F1308"
    FEAT_ORANGE_BORDER = "#FB923C"

    def __init__(self):
        self.api_key = settings.RESEND_API_KEY or None
        from_name = settings.EMAIL_FROM_NAME or "DealGapIQ"
        from_addr = settings.EMAIL_FROM or "noreply@dealgapiq.com"
        self.from_email = f"{from_name} <{from_addr}>"
        self.frontend_url = settings.FRONTEND_URL or "https://dealgapiq.com"
        self.is_configured = bool(self.api_key and RESEND_AVAILABLE)

        if self.is_configured:
            resend.api_key = self.api_key
            logger.info("Email service initialized with Resend")
        else:
            logger.warning("Email service running in dev mode (no emails will be sent)")

    async def send_email(
        self,
        to: str | list[str],
        subject: str,
        html: str,
        text: str | None = None,
        reply_to: str | None = None,
        headers: dict[str, str] | None = None,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        """Send an email via Resend.

        Returns ``{"success": bool, "id"|"error": str}``.  Plain-text
        fallback is auto-generated from the HTML when ``text`` is not
        provided, improving deliverability and accessibility.
        """
        if text is None:
            text = self._html_to_text(html)

        if not self.is_configured:
            logger.info(f"[DEV EMAIL] To: {to} | Subject: {subject}")
            logger.debug(f"[DEV EMAIL] Body: {html[:200]}...")
            return {"id": "dev-mode", "success": True}

        try:
            params: dict[str, Any] = {
                "from": self.from_email,
                "to": [to] if isinstance(to, str) else to,
                "subject": subject,
                "html": html,
                "text": text,
            }

            if reply_to:
                params["reply_to"] = reply_to
            if headers:
                params["headers"] = headers

            # The Resend Python SDK is synchronous (blocking HTTP). Wrap in
            # asyncio.to_thread so it runs in the default thread pool instead
            # of blocking the event loop. Important when the API call takes
            # >100ms — without this, every concurrent request to the backend
            # stalls until Resend responds.
            send_kwargs: dict[str, Any] = {}
            if idempotency_key:
                send_kwargs["idempotency_key"] = idempotency_key
            response = await asyncio.to_thread(
                resend.Emails.send,
                params,
                **send_kwargs,
            )
            message_id = response.get("id") if isinstance(response, dict) else None
            logger.info(f"Email sent to {to}: {message_id or 'unknown'}")
            return {"id": message_id, "success": True}

        except Exception as e:
            # Loud error so outages surface in Railway logs / Sentry alerts
            logger.error(
                "Failed to send email to %s (subject=%r): %s",
                to,
                subject,
                e,
                exc_info=True,
            )
            return {"error": str(e), "success": False}

    # ===========================================
    # Email Templates
    # ===========================================

    def _base_template(self, content: str, preview_text: str = "") -> str:
        """Wrap content in the dark base email template.

        The ``color-scheme`` and ``supported-color-schemes`` meta tags
        plus a ``meta name="color-scheme"`` declaration tell Apple
        Mail, Outlook, and modern Gmail clients to render in dark mode
        only — preventing auto-inversion that mangles dark cards.
        """
        return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="dark">
    <meta name="supported-color-schemes" content="dark">
    <title>DealGapIQ</title>
    <style type="text/css">
        :root {{ color-scheme: dark; supported-color-schemes: dark; }}
        body, table, td, p, a, h1, h2, h3 {{ -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }}
        a {{ color: {self.BRAND_LINK}; }}
        @media (prefers-color-scheme: light) {{
            /* Force dark even when user prefers light — brand consistency */
            body, .page {{ background-color: {self.PAGE_BG} !important; }}
            .card {{ background-color: {self.CARD_BG} !important; }}
        }}
    </style>
    <!--[if mso]>
    <style type="text/css">
        table {{ border-collapse: collapse; }}
        .button {{ padding: 14px 28px !important; }}
    </style>
    <![endif]-->
</head>
<body class="page" style="margin: 0; padding: 0; background-color: {self.PAGE_BG}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: {self.TXT_BODY};">
    <div style="display: none; max-height: 0; overflow: hidden; color: transparent;">
        {preview_text}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: {self.PAGE_BG};">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
                    <!-- Header / Logo -->
                    <tr>
                        <td align="center" style="padding-bottom: 28px;">
                            <table role="presentation" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="background: {self.BRAND_GRADIENT}; border-radius: 12px; padding: 12px 22px;">
                                        <span style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">DealGap<span style="color: #E0F2FE;">IQ</span></span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Content Card -->
                    <tr>
                        <td>
                            <table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" style="background-color: {self.CARD_BG}; border: 1px solid {self.BORDER}; border-radius: 16px;">
                                <tr>
                                    <td style="padding: 40px;">
                                        {content}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding-top: 28px;">
                            <p style="font-size: 13px; color: {self.TXT_MUTED}; margin: 0 0 6px 0;">
                                © {datetime.now().year} DealGapIQ. All rights reserved.
                            </p>
                            <p style="font-size: 12px; color: {self.TXT_DIM}; margin: 0;">
                                You're receiving this email because you have a DealGapIQ account.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""

    def _button(self, text: str, url: str, variant: str = "brand") -> str:
        """Render a styled CTA button.

        ``variant`` selects the gradient: ``"brand"`` (blue) or
        ``"danger"`` (red).  Uses bulletproof VML for Outlook fallback.
        """
        if variant == "danger":
            gradient = f"linear-gradient(135deg, {self.DANGER_BUTTON_FROM} 0%, {self.DANGER_BUTTON_TO} 100%)"
            solid_fallback = self.DANGER_BUTTON_TO
        else:
            gradient = self.BRAND_GRADIENT
            solid_fallback = self.BRAND_FROM

        return f'''
<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
    <tr>
        <td align="center" style="background: {solid_fallback}; background-image: {gradient}; border-radius: 10px;">
            <a href="{url}" target="_blank" class="button" style="display: inline-block; padding: 14px 30px; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 10px; letter-spacing: 0.01em;">
                {text}
            </a>
        </td>
    </tr>
</table>
'''

    # ===========================================
    # Helpers
    # ===========================================

    @staticmethod
    def _html_to_text(html_content: str) -> str:
        """Convert HTML email content to a readable plain-text fallback."""
        text = re.sub(r"<br\s*/?>", "\n", html_content)
        text = re.sub(r"</p>", "\n\n", text)
        text = re.sub(r"</h[1-6]>", "\n\n", text)
        text = re.sub(r"</li>", "\n", text)
        text = re.sub(r"<li[^>]*>", "  - ", text)
        text = re.sub(r'<a[^>]*href="([^"]*)"[^>]*>([^<]*)</a>', r"\2 (\1)", text)
        text = re.sub(r"<[^>]+>", "", text)
        text = html_lib.unescape(text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = re.sub(r" {2,}", " ", text)
        return text.strip()

    _CTA_RETURN_MAX = 400

    @staticmethod
    def _resolve_cta_path(return_to: str | None, *, default: str = "/search") -> str:
        """Validate a post-checkout deep-link path for email CTAs (no open redirects)."""
        if not return_to or not isinstance(return_to, str):
            return default
        s = return_to.strip()
        if len(s) > EmailService._CTA_RETURN_MAX or not s.startswith("/") or s.startswith("//"):
            return default
        if any(c in s for c in ("\n", "\r", "\x00")):
            return default
        return s

    def _generate_unsubscribe_token(self, email: str, category: str) -> str:
        """Create an HMAC token for one-click email unsubscribe."""
        key = (settings.SECRET_KEY or "dev-key").encode()
        message = f"unsubscribe:{email}:{category}".encode()
        return hmac.new(key, message, hashlib.sha256).hexdigest()

    def _unsubscribe_url(self, email: str, category: str = "marketing") -> str:
        """Build a tokenized unsubscribe URL."""
        token = self._generate_unsubscribe_token(email, category)
        return f"{self.frontend_url}/unsubscribe?email={email}&category={category}&token={token}"

    def _marketing_headers(self, email: str, category: str = "marketing") -> dict[str, str]:
        """Return ``List-Unsubscribe`` headers for non-transactional emails."""
        unsub_url = self._unsubscribe_url(email, category)
        return {
            "List-Unsubscribe": f"<{unsub_url}>",
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        }

    def _marketing_footer(self, email: str, category: str = "marketing") -> str:
        """Extra footer block with unsubscribe link for marketing-adjacent emails."""
        unsub_url = self._unsubscribe_url(email, category)
        prefs_url = f"{self.frontend_url}/profile"
        return f'''
<hr style="border: none; border-top: 1px solid {self.DIVIDER}; margin: 24px 0;">
<p style="font-size: 12px; color: {self.TXT_DIM}; margin: 0; text-align: center;">
    <a href="{unsub_url}" style="color: {self.TXT_MUTED}; text-decoration: underline;">Unsubscribe</a>
    &nbsp;&middot;&nbsp;
    <a href="{prefs_url}" style="color: {self.TXT_MUTED}; text-decoration: underline;">Manage preferences</a>
</p>
'''

    # ===========================================
    # Transactional Emails
    # ===========================================

    async def send_verification_email(
        self,
        to: str,
        user_name: str,
        verification_token: str,
    ) -> dict[str, Any]:
        """Send email verification email."""
        verification_url = f"{self.frontend_url}/verify-email?token={verification_token}"

        content = f'''
<h1 style="font-size: 24px; font-weight: 800; color: {self.TXT_HEADING}; margin: 0 0 16px 0; letter-spacing: -0.02em;">
    Verify your email address
</h1>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 24px 0;">
    Thanks for signing up for DealGapIQ! Please verify your email address by clicking the button below.
</p>

{self._button("Verify Email Address", verification_url)}

<p style="font-size: 14px; color: {self.TXT_SECONDARY}; line-height: 1.6; margin: 24px 0 0 0;">
    If you didn't create an account with DealGapIQ, you can safely ignore this email.
</p>
<p style="font-size: 14px; color: {self.TXT_SECONDARY}; line-height: 1.6; margin: 8px 0 0 0;">
    This link will expire in {settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS} hours.
</p>

<hr style="border: none; border-top: 1px solid {self.DIVIDER}; margin: 24px 0;">

<p style="font-size: 12px; color: {self.TXT_MUTED}; margin: 0;">
    Or copy and paste this URL into your browser:<br>
    <a href="{verification_url}" style="color: {self.BRAND_LINK}; word-break: break-all;">{verification_url}</a>
</p>
'''

        html = self._base_template(content, "Verify your email to get started with DealGapIQ")

        return await self.send_email(
            to=to,
            subject="Verify your email address - DealGapIQ",
            html=html,
            idempotency_key=f"verify-email/{verification_token}",
        )

    async def send_password_reset_email(
        self,
        to: str,
        user_name: str,
        reset_token: str,
    ) -> dict[str, Any]:
        """Send password reset email."""
        reset_url = f"{self.frontend_url}/reset-password?token={reset_token}"

        content = f'''
<h1 style="font-size: 24px; font-weight: 800; color: {self.TXT_HEADING}; margin: 0 0 16px 0; letter-spacing: -0.02em;">
    Reset your password
</h1>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 24px 0;">
    We received a request to reset the password for your DealGapIQ account. Click the button below to create a new password.
</p>

{self._button("Reset Password", reset_url, variant="danger")}

<p style="font-size: 14px; color: {self.TXT_SECONDARY}; line-height: 1.6; margin: 24px 0 0 0;">
    If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
</p>
<p style="font-size: 14px; color: {self.TXT_SECONDARY}; line-height: 1.6; margin: 8px 0 0 0;">
    This link will expire in {settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS} hour(s) for security reasons.
</p>

<hr style="border: none; border-top: 1px solid {self.DIVIDER}; margin: 24px 0;">

<p style="font-size: 12px; color: {self.TXT_MUTED}; margin: 0;">
    Or copy and paste this URL into your browser:<br>
    <a href="{reset_url}" style="color: {self.BRAND_LINK}; word-break: break-all;">{reset_url}</a>
</p>
'''

        html = self._base_template(content, "Reset your DealGapIQ password")

        return await self.send_email(
            to=to,
            subject="Reset your password - DealGapIQ",
            html=html,
            idempotency_key=f"password-reset/{reset_token}",
        )

    async def send_welcome_email(
        self,
        to: str,
        user_name: str,
    ) -> dict[str, Any]:
        """Send welcome email after verification."""
        search_url = f"{self.frontend_url}/search"
        strategies_url = f"{self.frontend_url}/strategies"

        content = f'''
<h1 style="font-size: 26px; font-weight: 800; color: {self.TXT_HEADING}; margin: 0 0 16px 0; letter-spacing: -0.02em;">
    Welcome to DealGapIQ
</h1>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 16px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 24px 0;">
    Your account is verified and you're ready to start analyzing real estate deals like a pro. Here's what you can do:
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
    <tr>
        <td style="padding: 16px; background-color: {self.FEAT_BLUE_BG}; border-radius: 12px; border-left: 4px solid {self.FEAT_BLUE_BORDER};">
            <p style="font-weight: 700; color: {self.TXT_HEADING}; margin: 0 0 4px 0;">Search Properties</p>
            <p style="font-size: 14px; color: {self.TXT_BODY}; margin: 0;">Enter any US address to get instant valuations, rent estimates, and investment analysis.</p>
        </td>
    </tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
    <tr>
        <td style="padding: 16px; background-color: {self.FEAT_PURPLE_BG}; border-radius: 12px; border-left: 4px solid {self.FEAT_PURPLE_BORDER};">
            <p style="font-weight: 700; color: {self.TXT_HEADING}; margin: 0 0 4px 0;">Analyze 6 Strategies</p>
            <p style="font-size: 14px; color: {self.TXT_BODY}; margin: 0;">Compare Long-Term Rental, Short-Term Rental, BRRRR, Fix &amp; Flip, House Hack, and Wholesale.</p>
        </td>
    </tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: {self.FEAT_ORANGE_BG}; border-radius: 12px; border-left: 4px solid {self.FEAT_ORANGE_BORDER};">
            <p style="font-weight: 700; color: {self.TXT_HEADING}; margin: 0 0 4px 0;">Save &amp; Track Deals</p>
            <p style="font-size: 14px; color: {self.TXT_BODY}; margin: 0;">Save properties to your dashboard, add notes, and track your deal pipeline.</p>
        </td>
    </tr>
</table>

{self._button("Start analyzing", search_url)}

<p style="font-size: 14px; color: {self.TXT_SECONDARY}; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
    Have questions? Reply to this email or visit our <a href="{strategies_url}" style="color: {self.BRAND_LINK};">Strategy Guides</a>.
</p>
'''

        html = self._base_template(content, "Your DealGapIQ account is ready!")

        return await self.send_email(
            to=to,
            subject="Welcome to DealGapIQ",
            html=html,
        )

    async def send_password_changed_email(
        self,
        to: str,
        user_name: str,
    ) -> dict[str, Any]:
        """Send notification that password was changed."""
        content = f'''
<h1 style="font-size: 24px; font-weight: 800; color: {self.TXT_HEADING}; margin: 0 0 16px 0; letter-spacing: -0.02em;">
    Password changed
</h1>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 24px 0;">
    Your DealGapIQ password was successfully changed. If you made this change, you can safely ignore this email.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
        <td style="padding: 16px; background-color: {self.DANGER_BG}; border-radius: 12px; border-left: 4px solid {self.DANGER_BORDER};">
            <p style="font-weight: 700; color: {self.DANGER_HEADING}; margin: 0 0 4px 0;">Didn't make this change?</p>
            <p style="font-size: 14px; color: {self.DANGER_BODY}; margin: 0;">
                If you didn't change your password, your account may be compromised. Please <a href="{self.frontend_url}/forgot-password" style="color: {self.DANGER_LINK}; font-weight: 600;">reset your password immediately</a> and contact support.
            </p>
        </td>
    </tr>
</table>

<p style="font-size: 14px; color: {self.TXT_MUTED}; line-height: 1.6; margin: 24px 0 0 0;">
    Changed: {datetime.now().strftime("%B %d, %Y at %I:%M %p")} UTC
</p>
'''

        html = self._base_template(content, "Your DealGapIQ password was changed")

        return await self.send_email(
            to=to,
            subject="Your password was changed - DealGapIQ",
            html=html,
        )

    # ===========================================
    # Billing & Subscription Emails
    # ===========================================

    async def send_pro_welcome_email(
        self,
        to: str,
        user_name: str,
        trial_end_date: str | None = None,
        return_to: str | None = None,
    ) -> dict[str, Any]:
        """Send welcome email when user starts a Pro subscription (trial or paid)."""
        billing_url = f"{self.frontend_url}/billing"
        cta_url = f"{self.frontend_url}{self._resolve_cta_path(return_to)}"

        trial_note = ""
        if trial_end_date:
            trial_note = f'''
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: {self.WARN_BG}; border-radius: 12px; border-left: 4px solid {self.WARN_BORDER};">
            <p style="font-weight: 700; color: {self.WARN_HEADING}; margin: 0 0 4px 0;">Your 7-day free trial is active</p>
            <p style="font-size: 14px; color: {self.WARN_BODY}; margin: 0;">
                You won't be charged until <strong style="color: {self.WARN_HEADING};">{trial_end_date}</strong>. Cancel anytime from your
                <a href="{billing_url}" style="color: {self.WARN_LINK}; font-weight: 600;">billing page</a>.
            </p>
        </td>
    </tr>
</table>
'''

        content = f'''
<h1 style="font-size: 26px; font-weight: 800; color: {self.TXT_HEADING}; margin: 0 0 16px 0; letter-spacing: -0.02em;">
    You're now a Pro Investor
</h1>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 24px 0;">
    Welcome to DealGapIQ Pro. You now have full access to every tool serious investors use to find, analyze, and close deals faster.
</p>

{trial_note}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
    <tr>
        <td style="padding: 16px; background-color: {self.FEAT_BLUE_BG}; border-radius: 12px; border-left: 4px solid {self.FEAT_BLUE_BORDER};">
            <p style="font-weight: 700; color: {self.TXT_HEADING}; margin: 0 0 4px 0;">Unlimited Property Analyses</p>
            <p style="font-size: 14px; color: {self.TXT_BODY}; margin: 0;">No caps. Analyze every deal that hits your radar.</p>
        </td>
    </tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
    <tr>
        <td style="padding: 16px; background-color: {self.FEAT_PURPLE_BG}; border-radius: 12px; border-left: 4px solid {self.FEAT_PURPLE_BORDER};">
            <p style="font-weight: 700; color: {self.TXT_HEADING}; margin: 0 0 4px 0;">Full Calculation Breakdowns &amp; Stress Testing</p>
            <p style="font-size: 14px; color: {self.TXT_BODY}; margin: 0;">Edit inputs, test scenarios, and verify every assumption.</p>
        </td>
    </tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: {self.FEAT_ORANGE_BG}; border-radius: 12px; border-left: 4px solid {self.FEAT_ORANGE_BORDER};">
            <p style="font-weight: 700; color: {self.TXT_HEADING}; margin: 0 0 4px 0;">Excel Proformas &amp; Lender-Ready PDFs</p>
            <p style="font-size: 14px; color: {self.TXT_BODY}; margin: 0;">Download, share, and close with confidence.</p>
        </td>
    </tr>
</table>

{self._button("Start Analyzing Deals", cta_url)}

<p style="font-size: 14px; color: {self.TXT_SECONDARY}; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
    Manage your subscription anytime from your <a href="{billing_url}" style="color: {self.BRAND_LINK};">billing page</a>.
</p>
'''

        html = self._base_template(content, "You're now a DealGapIQ Pro Investor")

        return await self.send_email(
            to=to,
            subject="Welcome to DealGapIQ Pro",
            html=html,
        )

    async def send_trial_ending_email(
        self,
        to: str,
        user_name: str,
        trial_end_date: str,
    ) -> dict[str, Any]:
        """Send reminder 3 days before trial ends."""
        billing_url = f"{self.frontend_url}/billing"
        search_url = f"{self.frontend_url}/search"

        content = f'''
<h1 style="font-size: 24px; font-weight: 800; color: {self.TXT_HEADING}; margin: 0 0 16px 0; letter-spacing: -0.02em;">
    Your free trial ends on {trial_end_date}
</h1>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 24px 0;">
    Your DealGapIQ Pro trial ends in 3 days. After <strong style="color: {self.TXT_HEADING};">{trial_end_date}</strong>, your subscription will convert to a paid plan automatically.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: {self.INFO_BG}; border-radius: 12px; border-left: 4px solid {self.INFO_BORDER};">
            <p style="font-weight: 700; color: {self.INFO_HEADING}; margin: 0 0 8px 0;">What happens next?</p>
            <ul style="font-size: 14px; color: {self.TXT_BODY}; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Your card on file will be charged at your selected billing cycle</li>
                <li>All Pro features remain available with no interruption</li>
                <li>You can cancel or change plans anytime from your billing page</li>
            </ul>
        </td>
    </tr>
</table>

<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 24px 0;">
    Want to keep going? No action needed — your Pro access continues seamlessly.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
        <td align="center">
            {self._button("Continue Analyzing Deals", search_url)}
        </td>
    </tr>
    <tr>
        <td align="center" style="padding-top: 8px;">
            <a href="{billing_url}" style="font-size: 14px; color: {self.TXT_SECONDARY}; text-decoration: underline;">Manage subscription</a>
        </td>
    </tr>
</table>
'''

        html = self._base_template(content, f"Your DealGapIQ Pro trial ends on {trial_end_date}")

        return await self.send_email(
            to=to,
            subject=f"Your Pro trial ends on {trial_end_date} - DealGapIQ",
            html=html,
        )

    async def send_payment_receipt_email(
        self,
        to: str,
        user_name: str,
        amount_cents: int,
        currency: str,
        description: str,
        receipt_url: str | None = None,
        invoice_pdf_url: str | None = None,
    ) -> dict[str, Any]:
        """Send payment receipt after successful charge."""
        billing_url = f"{self.frontend_url}/billing"
        amount_display = (
            f"${amount_cents / 100:,.2f}" if currency == "usd" else f"{amount_cents / 100:,.2f} {currency.upper()}"
        )

        receipt_link = ""
        if receipt_url:
            receipt_link = (
                f'<a href="{receipt_url}" style="color: {self.BRAND_LINK}; font-weight: 600;">View receipt</a>'
            )
        if invoice_pdf_url:
            separator = " &middot; " if receipt_link else ""
            receipt_link += f'{separator}<a href="{invoice_pdf_url}" style="color: {self.BRAND_LINK}; font-weight: 600;">Download invoice (PDF)</a>'

        content = f'''
<h1 style="font-size: 24px; font-weight: 800; color: {self.TXT_HEADING}; margin: 0 0 16px 0; letter-spacing: -0.02em;">
    Payment received
</h1>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 24px 0;">
    Hi {user_name or "there"}, we received your payment. Here are the details:
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 20px; background-color: {self.NESTED_BG}; border: 1px solid {self.BORDER}; border-radius: 12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding-bottom: 12px; border-bottom: 1px solid {self.DIVIDER};">
                        <p style="font-size: 12px; color: {self.TXT_SECONDARY}; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.08em;">Amount</p>
                        <p style="font-size: 28px; font-weight: 800; color: {self.TXT_HEADING}; margin: 0;">{amount_display}</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding-top: 12px;">
                        <p style="font-size: 12px; color: {self.TXT_SECONDARY}; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.08em;">Description</p>
                        <p style="font-size: 16px; color: {self.TXT_BODY}; margin: 0;">{description}</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding-top: 12px;">
                        <p style="font-size: 12px; color: {self.TXT_SECONDARY}; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.08em;">Date</p>
                        <p style="font-size: 16px; color: {self.TXT_BODY}; margin: 0;">{datetime.now().strftime("%B %d, %Y")}</p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<p style="font-size: 14px; color: {self.TXT_SECONDARY}; line-height: 1.6; margin: 0 0 8px 0; text-align: center;">
    {receipt_link}
</p>
<p style="font-size: 14px; color: {self.TXT_SECONDARY}; line-height: 1.6; margin: 0; text-align: center;">
    Manage billing at your <a href="{billing_url}" style="color: {self.BRAND_LINK};">billing page</a>.
</p>
'''

        html = self._base_template(content, f"Payment of {amount_display} received")

        return await self.send_email(
            to=to,
            subject=f"Payment received ({amount_display}) - DealGapIQ",
            html=html,
        )

    async def send_payment_failed_email(
        self,
        to: str,
        user_name: str,
        amount_cents: int | None = None,
        currency: str = "usd",
    ) -> dict[str, Any]:
        """Send notification when a payment fails.

        ``amount_cents`` is optional — when ``None`` or ``0`` the email
        omits the specific dollar figure.
        """
        billing_url = f"{self.frontend_url}/billing"

        if amount_cents:
            amount_display = (
                f"${amount_cents / 100:,.2f}" if currency == "usd" else f"{amount_cents / 100:,.2f} {currency.upper()}"
            )
            amount_sentence = (
                f'your payment of <strong style="color: {self.TXT_HEADING};">{amount_display}</strong> for'
            )
            preview_text = f"Action required: payment of {amount_display} failed"
        else:
            amount_sentence = "your payment for"
            preview_text = "Action required: payment failed for your DealGapIQ Pro subscription"

        content = f"""
<h1 style="font-size: 24px; font-weight: 800; color: {self.TXT_HEADING}; margin: 0 0 16px 0; letter-spacing: -0.02em;">
    Payment failed
</h1>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 24px 0;">
    We were unable to process {amount_sentence} your DealGapIQ Pro subscription.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: {self.DANGER_BG}; border-radius: 12px; border-left: 4px solid {self.DANGER_BORDER};">
            <p style="font-weight: 700; color: {self.DANGER_HEADING}; margin: 0 0 8px 0;">What happens now?</p>
            <ul style="font-size: 14px; color: {self.DANGER_BODY}; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>We'll retry the payment automatically over the next few days</li>
                <li>Your Pro features remain active during this time</li>
                <li>If retries fail, your account will be downgraded to Starter</li>
            </ul>
        </td>
    </tr>
</table>

<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 24px 0;">
    Please update your payment method to avoid losing access to Pro features.
</p>

{self._button("Update Payment Method", billing_url, variant="danger")}

<p style="font-size: 14px; color: {self.TXT_SECONDARY}; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
    If you believe this is an error, please check with your bank or reply to this email.
</p>
"""

        html = self._base_template(content, preview_text)

        return await self.send_email(
            to=to,
            subject="Payment failed - action required - DealGapIQ",
            html=html,
        )

    async def send_subscription_canceled_email(
        self,
        to: str,
        user_name: str,
    ) -> dict[str, Any]:
        """Send confirmation when subscription is fully canceled."""
        pricing_url = f"{self.frontend_url}/pricing"

        content = f"""
<h1 style="font-size: 24px; font-weight: 800; color: {self.TXT_HEADING}; margin: 0 0 16px 0; letter-spacing: -0.02em;">
    Your Pro subscription has ended
</h1>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 24px 0;">
    Your DealGapIQ Pro subscription has been canceled. Your account has been moved to the Starter plan.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: {self.NESTED_BG}; border: 1px solid {self.BORDER}; border-radius: 12px;">
            <p style="font-weight: 700; color: {self.TXT_HEADING}; margin: 0 0 8px 0;">Your Starter plan includes:</p>
            <ul style="font-size: 14px; color: {self.TXT_BODY}; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>3 property analyses per month</li>
                <li>Deal Gap, Income Value, and Target Buy metrics</li>
                <li>Discovery Score</li>
                <li>All 6 strategy snapshots</li>
            </ul>
        </td>
    </tr>
</table>

<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 24px 0;">
    You can re-subscribe anytime to regain full access to unlimited analyses, editable inputs, proformas, and lender-ready reports.
</p>

{self._button("View Plans", pricing_url)}
"""

        html = self._base_template(content, "Your DealGapIQ Pro subscription has ended")

        return await self.send_email(
            to=to,
            subject="Your Pro subscription has ended - DealGapIQ",
            html=html,
        )

    async def send_analysis_limit_reached_email(
        self,
        to: str,
        user_name: str,
        limit: int,
    ) -> dict[str, Any]:
        """Send notification when user hits their monthly analysis limit."""
        pricing_url = f"{self.frontend_url}/billing"

        content = f"""
<h1 style="font-size: 24px; font-weight: 800; color: {self.TXT_HEADING}; margin: 0 0 16px 0; letter-spacing: -0.02em;">
    You've used all {limit} free analyses this month
</h1>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 24px 0;">
    You've reached your monthly limit of {limit} property analyses on your Starter plan. Upgrade to Pro for unlimited analyses and full access to every DealGapIQ tool.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: {self.INFO_BG}; border-radius: 12px; border-left: 4px solid {self.INFO_BORDER};">
            <p style="font-weight: 700; color: {self.INFO_HEADING}; margin: 0 0 8px 0;">Pro Investor includes:</p>
            <ul style="font-size: 14px; color: {self.TXT_BODY}; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li><strong style="color: {self.TXT_HEADING};">Unlimited</strong> property analyses</li>
                <li>Full calculation breakdowns &amp; stress testing</li>
                <li>Downloadable Excel proformas</li>
                <li>Lender-ready PDF reports</li>
                <li>Side-by-side deal comparison</li>
            </ul>
        </td>
    </tr>
</table>

{self._button("Upgrade to Pro", pricing_url)}

<p style="font-size: 14px; color: {self.TXT_SECONDARY}; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
    Your usage resets in approximately 30 days from your last reset date.
</p>
"""

        html = self._base_template(content, f"You've used all {limit} free analyses this month")

        return await self.send_email(
            to=to,
            subject="Analysis limit reached — Upgrade to continue - DealGapIQ",
            html=html,
        )

    async def send_upgrade_confirmation_email(
        self,
        to: str,
        user_name: str,
        plan_name: str = "Pro Investor",
    ) -> dict[str, Any]:
        """Send confirmation when a user upgrades from free to paid."""
        search_url = f"{self.frontend_url}/search"
        billing_url = f"{self.frontend_url}/billing"

        content = f'''
<h1 style="font-size: 24px; font-weight: 800; color: {self.TXT_HEADING}; margin: 0 0 16px 0; letter-spacing: -0.02em;">
    Upgrade confirmed
</h1>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 24px 0;">
    Your DealGapIQ account has been upgraded to <strong style="color: {self.TXT_HEADING};">{plan_name}</strong>. All Pro features are now active — unlimited analyses, editable inputs, proformas, PDF reports, and more.
</p>

{self._button("Start Analyzing Deals", search_url)}

<p style="font-size: 14px; color: {self.TXT_SECONDARY}; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
    Manage your subscription anytime from your <a href="{billing_url}" style="color: {self.BRAND_LINK};">billing page</a>.
</p>
'''

        html = self._base_template(content, f"Your DealGapIQ account has been upgraded to {plan_name}")

        return await self.send_email(
            to=to,
            subject=f"Upgrade confirmed — Welcome to {plan_name} - DealGapIQ",
            html=html,
        )

    async def send_cancel_at_period_end_email(
        self,
        to: str,
        user_name: str,
        period_end_date: str,
    ) -> dict[str, Any]:
        """Send confirmation when a user schedules cancellation at period end."""
        billing_url = f"{self.frontend_url}/billing"

        content = f'''
<h1 style="font-size: 24px; font-weight: 800; color: {self.TXT_HEADING}; margin: 0 0 16px 0; letter-spacing: -0.02em;">
    Your cancellation is scheduled
</h1>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 24px 0;">
    Your DealGapIQ Pro subscription has been set to cancel. You'll continue to have full Pro access until <strong style="color: {self.TXT_HEADING};">{period_end_date}</strong>, after which your account will move to the Starter plan.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: {self.WARN_BG}; border-radius: 12px; border-left: 4px solid {self.WARN_BORDER};">
            <p style="font-weight: 700; color: {self.WARN_HEADING}; margin: 0 0 4px 0;">Changed your mind?</p>
            <p style="font-size: 14px; color: {self.WARN_BODY}; margin: 0;">
                You can reactivate your subscription anytime before <strong style="color: {self.WARN_HEADING};">{period_end_date}</strong> from your
                <a href="{billing_url}" style="color: {self.WARN_LINK}; font-weight: 600;">billing page</a> — no interruption in service.
            </p>
        </td>
    </tr>
</table>

{self._button("Manage Subscription", billing_url)}
'''

        html = self._base_template(content, f"Your Pro subscription will end on {period_end_date}")

        return await self.send_email(
            to=to,
            subject=f"Your Pro subscription will end on {period_end_date} - DealGapIQ",
            html=html,
        )

    # ===========================================
    # Security Emails
    # ===========================================

    async def send_new_device_login_email(
        self,
        to: str,
        user_name: str,
        device_info: str,
        ip_address: str | None = None,
        login_time: str | None = None,
    ) -> dict[str, Any]:
        """Alert user when a login occurs from an unrecognised device or IP."""
        reset_url = f"{self.frontend_url}/forgot-password"
        sessions_url = f"{self.frontend_url}/profile"
        time_display = login_time or datetime.now().strftime("%B %d, %Y at %I:%M %p UTC")

        content = f'''
<h1 style="font-size: 24px; font-weight: 800; color: {self.TXT_HEADING}; margin: 0 0 16px 0; letter-spacing: -0.02em;">
    New sign-in to your account
</h1>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 24px 0;">
    We detected a sign-in to your DealGapIQ account from a device we don't recognise.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: {self.NESTED_BG}; border: 1px solid {self.BORDER}; border-radius: 12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding-bottom: 8px;">
                        <p style="font-size: 12px; color: {self.TXT_SECONDARY}; margin: 0; text-transform: uppercase; letter-spacing: 0.08em;">Device</p>
                        <p style="font-size: 15px; color: {self.TXT_HEADING}; margin: 4px 0 0 0;">{device_info}</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding-bottom: 8px;">
                        <p style="font-size: 12px; color: {self.TXT_SECONDARY}; margin: 0; text-transform: uppercase; letter-spacing: 0.08em;">IP Address</p>
                        <p style="font-size: 15px; color: {self.TXT_HEADING}; margin: 4px 0 0 0;">{ip_address or "Unknown"}</p>
                    </td>
                </tr>
                <tr>
                    <td>
                        <p style="font-size: 12px; color: {self.TXT_SECONDARY}; margin: 0; text-transform: uppercase; letter-spacing: 0.08em;">Time</p>
                        <p style="font-size: 15px; color: {self.TXT_HEADING}; margin: 4px 0 0 0;">{time_display}</p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 24px 0;">
    If this was you, no action is needed. If you don't recognise this activity, secure your account immediately.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: {self.DANGER_BG}; border-radius: 12px; border-left: 4px solid {self.DANGER_BORDER};">
            <p style="font-weight: 700; color: {self.DANGER_HEADING}; margin: 0 0 8px 0;">This wasn't me</p>
            <ul style="font-size: 14px; color: {self.DANGER_BODY}; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li><a href="{reset_url}" style="color: {self.DANGER_LINK}; font-weight: 600;">Reset your password</a> immediately</li>
                <li><a href="{sessions_url}" style="color: {self.DANGER_LINK}; font-weight: 600;">Review active sessions</a> and revoke any you don't recognise</li>
                <li>Enable two-factor authentication if you haven't already</li>
            </ul>
        </td>
    </tr>
</table>
'''

        html = self._base_template(content, "New sign-in detected on your DealGapIQ account")

        return await self.send_email(
            to=to,
            subject="New sign-in to your account - DealGapIQ",
            html=html,
        )

    async def send_signup_notification_email(
        self,
        to: str,
        new_user_email: str,
        new_user_name: str | None,
        source: str,
        signup_time: str | None = None,
        location: str | None = None,
        total_users: int | None = None,
    ) -> dict[str, Any]:
        """Notify an admin that a new user signed up.

        Internal-only operational email. Reuses the standard dark-theme
        template so it visually matches every other DealGapIQ email.
        """
        time_display = signup_time or datetime.now().strftime("%B %d, %Y at %I:%M %p UTC")
        safe_name = html_lib.escape(new_user_name or "—")
        safe_email = html_lib.escape(new_user_email)
        safe_source = html_lib.escape(source)
        safe_location = html_lib.escape(location) if location else "Unknown"

        total_row = ""
        if total_users is not None:
            total_row = f"""
                <tr>
                    <td style="padding-top: 8px;">
                        <p style="font-size: 12px; color: {self.TXT_SECONDARY}; margin: 0; text-transform: uppercase; letter-spacing: 0.08em;">Total users</p>
                        <p style="font-size: 15px; color: {self.TXT_HEADING}; margin: 4px 0 0 0; font-weight: 700;">{total_users:,}</p>
                    </td>
                </tr>"""

        content = f"""
<h1 style="font-size: 24px; font-weight: 800; color: {self.TXT_HEADING}; margin: 0 0 16px 0; letter-spacing: -0.02em;">
    🎉 New DealGapIQ signup
</h1>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 24px 0;">
    A new user just created an account.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 20px; background-color: {self.NESTED_BG}; border: 1px solid {self.BORDER}; border-radius: 12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding-bottom: 8px;">
                        <p style="font-size: 12px; color: {self.TXT_SECONDARY}; margin: 0; text-transform: uppercase; letter-spacing: 0.08em;">Name</p>
                        <p style="font-size: 15px; color: {self.TXT_HEADING}; margin: 4px 0 0 0;">{safe_name}</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding-bottom: 8px;">
                        <p style="font-size: 12px; color: {self.TXT_SECONDARY}; margin: 0; text-transform: uppercase; letter-spacing: 0.08em;">Email</p>
                        <p style="font-size: 15px; color: {self.TXT_HEADING}; margin: 4px 0 0 0;">{safe_email}</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding-bottom: 8px;">
                        <p style="font-size: 12px; color: {self.TXT_SECONDARY}; margin: 0; text-transform: uppercase; letter-spacing: 0.08em;">Source</p>
                        <p style="font-size: 15px; color: {self.TXT_HEADING}; margin: 4px 0 0 0;">{safe_source}</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding-bottom: 8px;">
                        <p style="font-size: 12px; color: {self.TXT_SECONDARY}; margin: 0; text-transform: uppercase; letter-spacing: 0.08em;">Location</p>
                        <p style="font-size: 15px; color: {self.TXT_HEADING}; margin: 4px 0 0 0;">{safe_location}</p>
                    </td>
                </tr>
                <tr>
                    <td>
                        <p style="font-size: 12px; color: {self.TXT_SECONDARY}; margin: 0; text-transform: uppercase; letter-spacing: 0.08em;">Time</p>
                        <p style="font-size: 15px; color: {self.TXT_HEADING}; margin: 4px 0 0 0;">{time_display}</p>
                    </td>
                </tr>{total_row}
            </table>
        </td>
    </tr>
</table>

<p style="font-size: 12px; color: {self.TXT_DIM}; line-height: 1.6; margin: 16px 0 0 0;">
    This is an internal operational notification. Manage recipients via the
    <code style="color: {self.TXT_SECONDARY};">ADMIN_NOTIFICATION_EMAILS</code> environment variable.
</p>
"""

        html = self._base_template(content, f"New signup: {new_user_email}")

        return await self.send_email(
            to=to,
            subject=f"[DealGapIQ Signup] {new_user_name or new_user_email}",
            html=html,
        )

    async def send_mfa_enabled_email(
        self,
        to: str,
        user_name: str,
    ) -> dict[str, Any]:
        """Confirm that two-factor authentication was enabled."""
        content = f'''
<h1 style="font-size: 24px; font-weight: 800; color: {self.TXT_HEADING}; margin: 0 0 16px 0; letter-spacing: -0.02em;">
    Two-factor authentication enabled
</h1>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 24px 0;">
    Two-factor authentication (2FA) has been successfully enabled on your DealGapIQ account. You'll now need your authenticator app each time you sign in.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: {self.SUCCESS_BG}; border-radius: 12px; border-left: 4px solid {self.SUCCESS_BORDER};">
            <p style="font-weight: 700; color: {self.SUCCESS_HEADING}; margin: 0 0 4px 0;">Your account is now more secure</p>
            <p style="font-size: 14px; color: {self.SUCCESS_BODY}; margin: 0;">
                Keep your authenticator app and backup codes in a safe place. If you lose access, contact support.
            </p>
        </td>
    </tr>
</table>

<p style="font-size: 14px; color: {self.TXT_MUTED}; line-height: 1.6; margin: 24px 0 0 0;">
    Changed: {datetime.now().strftime("%B %d, %Y at %I:%M %p")} UTC
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px;">
    <tr>
        <td style="padding: 16px; background-color: {self.DANGER_BG}; border-radius: 12px; border-left: 4px solid {self.DANGER_BORDER};">
            <p style="font-size: 14px; color: {self.DANGER_BODY}; margin: 0;">
                If you did not make this change, <a href="{self.frontend_url}/forgot-password" style="color: {self.DANGER_LINK}; font-weight: 600;">reset your password immediately</a> and contact support.
            </p>
        </td>
    </tr>
</table>
'''

        html = self._base_template(content, "Two-factor authentication is now active on your account")

        return await self.send_email(
            to=to,
            subject="Two-factor authentication enabled - DealGapIQ",
            html=html,
        )

    async def send_mfa_disabled_email(
        self,
        to: str,
        user_name: str,
    ) -> dict[str, Any]:
        """Warn user that two-factor authentication was disabled."""
        content = f'''
<h1 style="font-size: 24px; font-weight: 800; color: {self.TXT_HEADING}; margin: 0 0 16px 0; letter-spacing: -0.02em;">
    Two-factor authentication disabled
</h1>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 24px 0;">
    Two-factor authentication (2FA) has been removed from your DealGapIQ account. Your account is now protected by your password only.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: {self.WARN_BG}; border-radius: 12px; border-left: 4px solid {self.WARN_BORDER};">
            <p style="font-weight: 700; color: {self.WARN_HEADING}; margin: 0 0 4px 0;">Your account security has been reduced</p>
            <p style="font-size: 14px; color: {self.WARN_BODY}; margin: 0;">
                We recommend keeping 2FA enabled. You can re-enable it anytime from your
                <a href="{self.frontend_url}/profile" style="color: {self.WARN_LINK}; font-weight: 600;">profile settings</a>.
            </p>
        </td>
    </tr>
</table>

<p style="font-size: 14px; color: {self.TXT_MUTED}; line-height: 1.6; margin: 24px 0 0 0;">
    Changed: {datetime.now().strftime("%B %d, %Y at %I:%M %p")} UTC
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px;">
    <tr>
        <td style="padding: 16px; background-color: {self.DANGER_BG}; border-radius: 12px; border-left: 4px solid {self.DANGER_BORDER};">
            <p style="font-size: 14px; color: {self.DANGER_BODY}; margin: 0;">
                If you did not make this change, your account may be compromised. <a href="{self.frontend_url}/forgot-password" style="color: {self.DANGER_LINK}; font-weight: 600;">Reset your password immediately</a>.
            </p>
        </td>
    </tr>
</table>
'''

        html = self._base_template(content, "Two-factor authentication has been disabled on your account")

        return await self.send_email(
            to=to,
            subject="Two-factor authentication disabled - DealGapIQ",
            html=html,
        )

    async def send_account_deletion_email(
        self,
        to: str,
        user_name: str,
        deletion_date: str | None = None,
    ) -> dict[str, Any]:
        """Confirm account deletion or scheduled deletion."""
        date_note = ""
        if deletion_date:
            date_note = f' Your data will be permanently deleted on <strong style="color: {self.TXT_HEADING};">{deletion_date}</strong>.'

        content = f'''
<h1 style="font-size: 24px; font-weight: 800; color: {self.TXT_HEADING}; margin: 0 0 16px 0; letter-spacing: -0.02em;">
    Account deletion confirmed
</h1>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 24px 0;">
    Your DealGapIQ account has been scheduled for deletion.{date_note}
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: {self.NESTED_BG}; border: 1px solid {self.BORDER}; border-radius: 12px;">
            <p style="font-weight: 700; color: {self.TXT_HEADING}; margin: 0 0 8px 0;">What will be removed:</p>
            <ul style="font-size: 14px; color: {self.TXT_BODY}; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Your account credentials and profile</li>
                <li>Saved properties and analysis history</li>
                <li>Subscription and payment records</li>
                <li>All associated data</li>
            </ul>
        </td>
    </tr>
</table>

<p style="font-size: 14px; color: {self.TXT_SECONDARY}; line-height: 1.6; margin: 0;">
    If you did not request this, contact <a href="mailto:support@dealgapiq.com" style="color: {self.BRAND_LINK};">support@dealgapiq.com</a> immediately to cancel the deletion.
</p>
<p style="font-size: 14px; color: {self.TXT_SECONDARY}; line-height: 1.6; margin: 8px 0 0 0;">
    You can sign up again anytime at <a href="{self.frontend_url}" style="color: {self.BRAND_LINK};">dealgapiq.com</a>.
</p>
'''

        html = self._base_template(content, "Your DealGapIQ account has been scheduled for deletion")

        return await self.send_email(
            to=to,
            subject="Account deletion confirmed - DealGapIQ",
            html=html,
        )

    # ===========================================
    # Engagement & Conversion Emails
    # ===========================================

    async def send_onboarding_nudge_email(
        self,
        to: str,
        user_name: str,
        steps_remaining: int,
    ) -> dict[str, Any]:
        """Nudge user who started but hasn't completed onboarding."""
        onboarding_url = f"{self.frontend_url}/onboarding"
        total_steps = 5

        content = f"""
<h1 style="font-size: 24px; font-weight: 800; color: {self.TXT_HEADING}; margin: 0 0 16px 0; letter-spacing: -0.02em;">
    You're {total_steps - steps_remaining} of {total_steps} steps in
</h1>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 24px 0;">
    You're almost ready to start analyzing deals. Finish setting up your investor profile so DealGapIQ can tailor results to your strategy, budget, and target markets.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: {self.INFO_BG}; border-radius: 12px; border-left: 4px solid {self.INFO_BORDER};">
            <p style="font-weight: 700; color: {self.INFO_HEADING}; margin: 0 0 8px 0;">What you'll unlock:</p>
            <ul style="font-size: 14px; color: {self.TXT_BODY}; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Personalised deal analysis tuned to your goals</li>
                <li>Discovery Score calibrated to your risk tolerance</li>
                <li>Strategy recommendations for your experience level</li>
            </ul>
        </td>
    </tr>
</table>

<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 8px 0;">
    It only takes about 2 minutes to finish.
</p>

{self._button("Complete Your Profile", onboarding_url)}

{self._marketing_footer(to, "product_updates")}
"""

        html = self._base_template(content, f"You're {steps_remaining} steps away from your first deal analysis")

        return await self.send_email(
            to=to,
            subject=f"Finish setting up your profile ({steps_remaining} steps left) - DealGapIQ",
            html=html,
            headers=self._marketing_headers(to, "product_updates"),
        )

    async def send_first_analysis_milestone_email(
        self,
        to: str,
        user_name: str,
        property_address: str,
    ) -> dict[str, Any]:
        """Congratulate user on completing their first property analysis."""
        search_url = f"{self.frontend_url}/search"
        pricing_url = f"{self.frontend_url}/pricing"

        content = f'''
<h1 style="font-size: 24px; font-weight: 800; color: {self.TXT_HEADING}; margin: 0 0 16px 0; letter-spacing: -0.02em;">
    Your first deal analysis is in the books
</h1>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 24px 0;">
    You just analyzed <strong style="color: {self.TXT_HEADING};">{property_address}</strong> — that's the hardest part done. Every serious investor starts by running the numbers, and now you have a data-backed Discovery on your first deal.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: {self.FEAT_PURPLE_BG}; border-radius: 12px; border-left: 4px solid {self.FEAT_PURPLE_BORDER};">
            <p style="font-weight: 700; color: {self.TXT_HEADING}; margin: 0 0 8px 0;">Want to go deeper? Pro Investor unlocks:</p>
            <ul style="font-size: 14px; color: {self.TXT_BODY}; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Unlimited analyses (no monthly cap)</li>
                <li>Editable inputs &amp; stress testing</li>
                <li>Downloadable Excel proformas</li>
                <li>Lender-ready PDF reports</li>
            </ul>
        </td>
    </tr>
</table>

{self._button("Analyze Another Property", search_url)}

<p style="font-size: 14px; color: {self.TXT_SECONDARY}; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
    Ready for unlimited access? <a href="{pricing_url}" style="color: {self.BRAND_LINK}; font-weight: 600;">View Pro plans</a>
</p>

{self._marketing_footer(to, "product_updates")}
'''

        html = self._base_template(content, "You just completed your first deal analysis on DealGapIQ")

        return await self.send_email(
            to=to,
            subject="Your first analysis is complete - DealGapIQ",
            html=html,
            headers=self._marketing_headers(to, "product_updates"),
        )

    async def send_reengagement_email(
        self,
        to: str,
        user_name: str,
        days_inactive: int,
    ) -> dict[str, Any]:
        """Re-engage a user who hasn't been active recently."""
        search_url = f"{self.frontend_url}/search"

        content = f"""
<h1 style="font-size: 24px; font-weight: 800; color: {self.TXT_HEADING}; margin: 0 0 16px 0; letter-spacing: -0.02em;">
    Deals don't wait — neither should you
</h1>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 24px 0;">
    It's been {days_inactive} days since your last visit. The market keeps moving — new listings, price drops, and opportunities are popping up every day.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: {self.INFO_BG}; border-radius: 12px; border-left: 4px solid {self.INFO_BORDER};">
            <p style="font-weight: 700; color: {self.INFO_HEADING}; margin: 0 0 8px 0;">Pick up where you left off</p>
            <ul style="font-size: 14px; color: {self.TXT_BODY}; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Search any US address for instant analysis</li>
                <li>Compare 6 investment strategies side by side</li>
                <li>Save deals to your pipeline</li>
            </ul>
        </td>
    </tr>
</table>

{self._button("Search a Property", search_url)}

{self._marketing_footer(to, "marketing")}
"""

        html = self._base_template(content, "New deals are waiting for you on DealGapIQ")

        return await self.send_email(
            to=to,
            subject="The market isn't waiting - DealGapIQ",
            html=html,
            headers=self._marketing_headers(to, "marketing"),
        )

    async def send_winback_email(
        self,
        to: str,
        user_name: str,
    ) -> dict[str, Any]:
        """Win back a user who recently canceled their Pro subscription."""
        pricing_url = f"{self.frontend_url}/pricing"

        content = f"""
<h1 style="font-size: 24px; font-weight: 800; color: {self.TXT_HEADING}; margin: 0 0 16px 0; letter-spacing: -0.02em;">
    Your Pro tools are still here
</h1>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 24px 0;">
    We noticed you recently canceled your DealGapIQ Pro subscription. If you're still actively investing, here's what you're missing:
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
    <tr>
        <td style="padding: 16px; background-color: {self.NESTED_BG}; border: 1px solid {self.BORDER}; border-radius: 12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding-bottom: 12px; border-bottom: 1px solid {self.DIVIDER};">
                        <p style="font-size: 14px; color: {self.TXT_BODY}; margin: 0;">
                            <strong style="color: {self.TXT_HEADING};">Unlimited analyses</strong> — your Starter plan limits you to 3 per month
                        </p>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid {self.DIVIDER};">
                        <p style="font-size: 14px; color: {self.TXT_BODY}; margin: 0;">
                            <strong style="color: {self.TXT_HEADING};">Editable inputs &amp; stress testing</strong> — change any variable, recalculate instantly
                        </p>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid {self.DIVIDER};">
                        <p style="font-size: 14px; color: {self.TXT_BODY}; margin: 0;">
                            <strong style="color: {self.TXT_HEADING};">Excel proformas &amp; PDF reports</strong> — download and share with lenders
                        </p>
                    </td>
                </tr>
                <tr>
                    <td style="padding-top: 12px;">
                        <p style="font-size: 14px; color: {self.TXT_BODY}; margin: 0;">
                            <strong style="color: {self.TXT_HEADING};">Side-by-side comparison</strong> — evaluate multiple deals at once
                        </p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 24px 0;">
    Re-subscribe anytime — your saved properties and analysis history are still here.
</p>

{self._button("View Pro Plans", pricing_url)}

{self._marketing_footer(to, "marketing")}
"""

        html = self._base_template(content, "Your DealGapIQ Pro tools are waiting for you")

        return await self.send_email(
            to=to,
            subject="Your Pro tools are still here - DealGapIQ",
            html=html,
            headers=self._marketing_headers(to, "marketing"),
        )

    # ===========================================
    # Retention Emails
    # ===========================================

    async def send_annual_renewal_reminder_email(
        self,
        to: str,
        user_name: str,
        renewal_date: str,
        amount_display: str,
    ) -> dict[str, Any]:
        """Remind annual subscribers about an upcoming renewal charge."""
        billing_url = f"{self.frontend_url}/billing"

        content = f'''
<h1 style="font-size: 24px; font-weight: 800; color: {self.TXT_HEADING}; margin: 0 0 16px 0; letter-spacing: -0.02em;">
    Your annual subscription renews soon
</h1>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 24px 0;">
    Your DealGapIQ Pro annual subscription will automatically renew on <strong style="color: {self.TXT_HEADING};">{renewal_date}</strong>.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 20px; background-color: {self.NESTED_BG}; border: 1px solid {self.BORDER}; border-radius: 12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding-bottom: 12px; border-bottom: 1px solid {self.DIVIDER};">
                        <p style="font-size: 12px; color: {self.TXT_SECONDARY}; margin: 0; text-transform: uppercase; letter-spacing: 0.08em;">Renewal amount</p>
                        <p style="font-size: 28px; font-weight: 800; color: {self.TXT_HEADING}; margin: 4px 0 0 0;">{amount_display}</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding-top: 12px;">
                        <p style="font-size: 12px; color: {self.TXT_SECONDARY}; margin: 0; text-transform: uppercase; letter-spacing: 0.08em;">Renewal date</p>
                        <p style="font-size: 16px; color: {self.TXT_BODY}; margin: 4px 0 0 0;">{renewal_date}</p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 24px 0;">
    No action needed if you'd like to continue. Your Pro access will renew automatically.
</p>

{self._button("Manage Subscription", billing_url)}

<p style="font-size: 14px; color: {self.TXT_SECONDARY}; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
    To cancel or change plans, visit your <a href="{billing_url}" style="color: {self.BRAND_LINK};">billing page</a> before {renewal_date}.
</p>
'''

        html = self._base_template(content, f"Your Pro subscription renews on {renewal_date}")

        return await self.send_email(
            to=to,
            subject=f"Annual renewal on {renewal_date} ({amount_display}) - DealGapIQ",
            html=html,
            headers=self._marketing_headers(to, "subscription_alerts"),
        )

    async def send_activity_digest_email(
        self,
        to: str,
        user_name: str,
        period: str,
        stats: dict[str, Any],
    ) -> dict[str, Any]:
        """Send a periodic activity digest summarising usage and saved property changes."""
        search_url = f"{self.frontend_url}/search"
        saved_url = f"{self.frontend_url}/saved-properties"

        analyses_count = stats.get("analyses_count", 0)
        saved_count = stats.get("saved_count", 0)
        price_drops = stats.get("price_drops", 0)

        rows = ""
        if analyses_count:
            rows += f"""
<tr><td style="padding: 8px 0; border-bottom: 1px solid {self.DIVIDER};">
    <span style="color: {self.TXT_SECONDARY};">Properties analysed</span></td>
    <td style="padding: 8px 0; border-bottom: 1px solid {self.DIVIDER}; text-align: right; font-weight: 700; color: {self.TXT_HEADING};">{analyses_count}</td></tr>"""
        if saved_count:
            rows += f"""
<tr><td style="padding: 8px 0; border-bottom: 1px solid {self.DIVIDER};">
    <span style="color: {self.TXT_SECONDARY};">Properties saved</span></td>
    <td style="padding: 8px 0; border-bottom: 1px solid {self.DIVIDER}; text-align: right; font-weight: 700; color: {self.TXT_HEADING};">{saved_count}</td></tr>"""
        if price_drops:
            rows += f"""
<tr><td style="padding: 8px 0;">
    <span style="color: {self.TXT_SECONDARY};">Saved properties with price drops</span></td>
    <td style="padding: 8px 0; text-align: right; font-weight: 700; color: {self.SUCCESS_HEADING};">{price_drops}</td></tr>"""

        content = f'''
<h1 style="font-size: 24px; font-weight: 800; color: {self.TXT_HEADING}; margin: 0 0 16px 0; letter-spacing: -0.02em;">
    Your {period} digest
</h1>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 24px 0;">
    Hi {user_name or "there"}, here's a snapshot of your DealGapIQ activity.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 20px; background-color: {self.NESTED_BG}; border: 1px solid {self.BORDER}; border-radius: 12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                {rows or f'<tr><td style="padding: 8px 0; color: {self.TXT_SECONDARY};">No activity this period — search a property to get started.</td></tr>'}
            </table>
        </td>
    </tr>
</table>

{self._button("Search a Property", search_url)}

<p style="font-size: 14px; color: {self.TXT_SECONDARY}; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
    <a href="{saved_url}" style="color: {self.BRAND_LINK};">View saved properties</a>
</p>

{self._marketing_footer(to, "digest")}
'''

        html = self._base_template(content, f"Your DealGapIQ {period} activity summary")

        return await self.send_email(
            to=to,
            subject=f"Your {period} digest - DealGapIQ",
            html=html,
            headers=self._marketing_headers(to, "digest"),
        )

    async def send_feature_announcement_email(
        self,
        to: str,
        user_name: str,
        feature_name: str,
        feature_description: str,
        cta_text: str = "Try It Now",
        cta_url: str | None = None,
    ) -> dict[str, Any]:
        """Announce a new feature or product update (manual trigger)."""
        url = cta_url or self.frontend_url

        content = f"""
<h1 style="font-size: 24px; font-weight: 800; color: {self.TXT_HEADING}; margin: 0 0 16px 0; letter-spacing: -0.02em;">
    New: {feature_name}
</h1>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 24px 0;">
    {feature_description}
</p>

{self._button(cta_text, url)}

{self._marketing_footer(to, "product_updates")}
"""

        html = self._base_template(content, f"New on DealGapIQ: {feature_name}")

        return await self.send_email(
            to=to,
            subject=f"New: {feature_name} - DealGapIQ",
            html=html,
            headers=self._marketing_headers(to, "product_updates"),
        )

    # ===========================================
    # Property & Alert Emails
    # ===========================================

    async def send_property_alert_email(
        self,
        to: str,
        user_name: str,
        property_address: str,
        alert_type: str,
        details: str,
    ) -> dict[str, Any]:
        """Send property alert notification."""
        property_url = f"{self.frontend_url}/property?address={property_address}"

        content = f"""
<h1 style="font-size: 24px; font-weight: 800; color: {self.TXT_HEADING}; margin: 0 0 16px 0; letter-spacing: -0.02em;">
    Property Alert: {alert_type}
</h1>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: {self.TXT_BODY}; line-height: 1.6; margin: 0 0 16px 0;">
    There's an update for one of your saved properties:
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: {self.INFO_BG}; border-radius: 12px; border-left: 4px solid {self.INFO_BORDER};">
            <p style="font-weight: 700; color: {self.INFO_HEADING}; margin: 0 0 8px 0;">{property_address}</p>
            <p style="font-size: 14px; color: {self.TXT_BODY}; margin: 0;">{details}</p>
        </td>
    </tr>
</table>

{self._button("View Property Analysis", property_url)}
"""

        html = self._base_template(content, f"Alert: {alert_type} for {property_address}")

        return await self.send_email(
            to=to,
            subject=f"Property Alert: {alert_type} - DealGapIQ",
            html=html,
        )


# Singleton instance
email_service = EmailService()
