"""
Email Service for sending transactional emails via Resend.
"""

import hashlib
import hmac
import html as html_lib
import logging
import re
from datetime import datetime
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

# Try to import resend, fall back gracefully if not available
try:
    import resend

    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False
    logger.warning("Resend not installed. Email functionality will be disabled.")


class EmailService:
    """
    Service for sending transactional emails.

    Uses Resend for email delivery with beautiful HTML templates.
    Falls back to logging emails in development mode.
    """

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
    ) -> dict[str, Any]:
        """Send an email via Resend.

        Auto-generates a plain-text fallback from the HTML when ``text``
        is not provided, improving deliverability and accessibility.
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

            response = resend.Emails.send(params)
            logger.info(f"Email sent to {to}: {response.get('id', 'unknown')}")
            return {"id": response.get("id"), "success": True}

        except Exception as e:
            logger.error(f"Failed to send email to {to}: {e}")
            return {"error": str(e), "success": False}

    # ===========================================
    # Email Templates
    # ===========================================

    def _base_template(self, content: str, preview_text: str = "") -> str:
        """Wrap content in the base email template."""
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DealGapIQ</title>
    <!--[if mso]>
    <style type="text/css">
        table {{ border-collapse: collapse; }}
        .button {{ padding: 12px 24px !important; }}
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <!-- Preview text -->
    <div style="display: none; max-height: 0; overflow: hidden;">
        {preview_text}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding-bottom: 30px;">
                            <table role="presentation" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="background: linear-gradient(135deg, #0891b2 0%, #00e5ff 100%); border-radius: 12px; padding: 12px 20px;">
                                        <span style="font-size: 24px; font-weight: bold; color: white; letter-spacing: -0.5px;">DealGapIQ</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Content Card -->
                    <tr>
                        <td>
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
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
                        <td align="center" style="padding-top: 30px;">
                            <p style="font-size: 13px; color: #71717a; margin: 0 0 8px 0;">
                                © {datetime.now().year} DealGapIQ. All rights reserved.
                            </p>
                            <p style="font-size: 12px; color: #a1a1aa; margin: 0;">
                                You're receiving this email because you have an DealGapIQ account.
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

    def _button(self, text: str, url: str, color: str = "#0891b2") -> str:
        """Generate a styled button."""
        return f'''
<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
    <tr>
        <td align="center" style="background-color: {color}; border-radius: 8px;">
            <a href="{url}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
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
<hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
<p style="font-size: 12px; color: #a1a1aa; margin: 0; text-align: center;">
    <a href="{unsub_url}" style="color: #a1a1aa; text-decoration: underline;">Unsubscribe</a>
    &nbsp;&middot;&nbsp;
    <a href="{prefs_url}" style="color: #a1a1aa; text-decoration: underline;">Manage preferences</a>
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
<h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0 0 16px 0;">
    Verify your email address
</h1>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
    Thanks for signing up for DealGapIQ! Please verify your email address by clicking the button below.
</p>

{self._button("Verify Email Address", verification_url)}

<p style="font-size: 14px; color: #71717a; line-height: 1.6; margin: 24px 0 0 0;">
    If you didn't create an account with DealGapIQ, you can safely ignore this email.
</p>
<p style="font-size: 14px; color: #71717a; line-height: 1.6; margin: 8px 0 0 0;">
    This link will expire in {settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS} hours.
</p>

<hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">

<p style="font-size: 12px; color: #a1a1aa; margin: 0;">
    Or copy and paste this URL into your browser:<br>
    <a href="{verification_url}" style="color: #0891b2; word-break: break-all;">{verification_url}</a>
</p>
'''

        html = self._base_template(content, "Verify your email to get started with DealGapIQ")

        return await self.send_email(
            to=to,
            subject="Verify your email address - DealGapIQ",
            html=html,
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
<h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0 0 16px 0;">
    Reset your password
</h1>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
    We received a request to reset the password for your DealGapIQ account. Click the button below to create a new password.
</p>

{self._button("Reset Password", reset_url, "#dc2626")}

<p style="font-size: 14px; color: #71717a; line-height: 1.6; margin: 24px 0 0 0;">
    If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
</p>
<p style="font-size: 14px; color: #71717a; line-height: 1.6; margin: 8px 0 0 0;">
    This link will expire in {settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS} hour(s) for security reasons.
</p>

<hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">

<p style="font-size: 12px; color: #a1a1aa; margin: 0;">
    Or copy and paste this URL into your browser:<br>
    <a href="{reset_url}" style="color: #0891b2; word-break: break-all;">{reset_url}</a>
</p>
'''

        html = self._base_template(content, "Reset your DealGapIQ password")

        return await self.send_email(
            to=to,
            subject="Reset your password - DealGapIQ",
            html=html,
        )

    async def send_welcome_email(
        self,
        to: str,
        user_name: str,
    ) -> dict[str, Any]:
        """Send welcome email after verification."""
        dashboard_url = f"{self.frontend_url}/dashboard"
        strategies_url = f"{self.frontend_url}/strategies"

        content = f'''
<h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0 0 16px 0;">
    Welcome to DealGapIQ! 🎉
</h1>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 16px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
    Your account is now verified and you're ready to start analyzing real estate deals like a pro. Here's what you can do:
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: #f0fdfa; border-radius: 12px; border-left: 4px solid #0891b2;">
            <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding-right: 12px; vertical-align: top;">
                        <span style="font-size: 20px;">🔍</span>
                    </td>
                    <td>
                        <p style="font-weight: 600; color: #18181b; margin: 0 0 4px 0;">Search Properties</p>
                        <p style="font-size: 14px; color: #3f3f46; margin: 0;">Enter any US address to get instant valuations, rent estimates, and investment analysis.</p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: #faf5ff; border-radius: 12px; border-left: 4px solid #8b5cf6;">
            <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding-right: 12px; vertical-align: top;">
                        <span style="font-size: 20px;">📊</span>
                    </td>
                    <td>
                        <p style="font-weight: 600; color: #18181b; margin: 0 0 4px 0;">Analyze 6 Strategies</p>
                        <p style="font-size: 14px; color: #3f3f46; margin: 0;">Compare Long-Term Rental, Short-Term Rental, BRRRR, Fix & Flip, House Hack, and Wholesale.</p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: #fff7ed; border-radius: 12px; border-left: 4px solid #f97316;">
            <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding-right: 12px; vertical-align: top;">
                        <span style="font-size: 20px;">💾</span>
                    </td>
                    <td>
                        <p style="font-weight: 600; color: #18181b; margin: 0 0 4px 0;">Save & Track Deals</p>
                        <p style="font-size: 14px; color: #3f3f46; margin: 0;">Save properties to your dashboard, add notes, and track your deal pipeline.</p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>

{self._button("Go to Dashboard", dashboard_url)}

<p style="font-size: 14px; color: #71717a; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
    Have questions? Reply to this email or visit our <a href="{strategies_url}" style="color: #0891b2;">Strategy Guides</a>.
</p>
'''

        html = self._base_template(content, "Your DealGapIQ account is ready!")

        return await self.send_email(
            to=to,
            subject="Welcome to DealGapIQ! 🎉",
            html=html,
        )

    async def send_password_changed_email(
        self,
        to: str,
        user_name: str,
    ) -> dict[str, Any]:
        """Send notification that password was changed."""
        content = f'''
<h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0 0 16px 0;">
    Password changed
</h1>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
    Your DealGapIQ password was successfully changed. If you made this change, you can safely ignore this email.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
        <td style="padding: 16px; background-color: #fef2f2; border-radius: 12px; border-left: 4px solid #dc2626;">
            <p style="font-weight: 600; color: #991b1b; margin: 0 0 4px 0;">⚠️ Didn't make this change?</p>
            <p style="font-size: 14px; color: #7f1d1d; margin: 0;">
                If you didn't change your password, your account may be compromised. Please <a href="{self.frontend_url}/forgot-password" style="color: #dc2626; font-weight: 600;">reset your password immediately</a> and contact support.
            </p>
        </td>
    </tr>
</table>

<p style="font-size: 14px; color: #71717a; line-height: 1.6; margin: 24px 0 0 0;">
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
    ) -> dict[str, Any]:
        """Send welcome email when user starts a Pro subscription (trial or paid)."""
        billing_url = f"{self.frontend_url}/billing"
        dashboard_url = f"{self.frontend_url}/dashboard"

        trial_note = ""
        if trial_end_date:
            trial_note = f'''
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: #fffbeb; border-radius: 12px; border-left: 4px solid #f59e0b;">
            <p style="font-weight: 600; color: #92400e; margin: 0 0 4px 0;">Your 7-day free trial is active</p>
            <p style="font-size: 14px; color: #78350f; margin: 0;">
                You won't be charged until <strong>{trial_end_date}</strong>. Cancel anytime from your
                <a href="{billing_url}" style="color: #d97706; font-weight: 600;">billing page</a>.
            </p>
        </td>
    </tr>
</table>
'''

        content = f'''
<h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0 0 16px 0;">
    You're now a Pro Investor
</h1>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
    Welcome to DealGapIQ Pro. You now have full access to every tool serious investors use to find, analyze, and close deals faster.
</p>

{trial_note}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
    <tr>
        <td style="padding: 16px; background-color: #f0fdfa; border-radius: 12px; border-left: 4px solid #0891b2;">
            <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding-right: 12px; vertical-align: top; font-size: 20px;">&#x267b;</td>
                    <td>
                        <p style="font-weight: 600; color: #18181b; margin: 0 0 4px 0;">Unlimited Property Analyses</p>
                        <p style="font-size: 14px; color: #3f3f46; margin: 0;">No caps. Analyze every deal that hits your radar.</p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
    <tr>
        <td style="padding: 16px; background-color: #faf5ff; border-radius: 12px; border-left: 4px solid #8b5cf6;">
            <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding-right: 12px; vertical-align: top; font-size: 20px;">&#x1f4ca;</td>
                    <td>
                        <p style="font-weight: 600; color: #18181b; margin: 0 0 4px 0;">Full Calculation Breakdowns & Stress Testing</p>
                        <p style="font-size: 14px; color: #3f3f46; margin: 0;">Edit inputs, test scenarios, and verify every assumption.</p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: #fff7ed; border-radius: 12px; border-left: 4px solid #f97316;">
            <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding-right: 12px; vertical-align: top; font-size: 20px;">&#x1f4c4;</td>
                    <td>
                        <p style="font-weight: 600; color: #18181b; margin: 0 0 4px 0;">Excel Proformas & Lender-Ready PDFs</p>
                        <p style="font-size: 14px; color: #3f3f46; margin: 0;">Download, share, and close with confidence.</p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>

{self._button("Start Analyzing Deals", dashboard_url)}

<p style="font-size: 14px; color: #71717a; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
    Manage your subscription anytime from your <a href="{billing_url}" style="color: #0891b2;">billing page</a>.
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
        dashboard_url = f"{self.frontend_url}/dashboard"

        content = f'''
<h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0 0 16px 0;">
    Your free trial ends on {trial_end_date}
</h1>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
    Your DealGapIQ Pro trial ends in 3 days. After <strong>{trial_end_date}</strong>, your subscription will convert to a paid plan automatically.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: #f0fdfa; border-radius: 12px; border-left: 4px solid #0891b2;">
            <p style="font-weight: 600; color: #18181b; margin: 0 0 8px 0;">What happens next?</p>
            <ul style="font-size: 14px; color: #3f3f46; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Your card on file will be charged at your selected billing cycle</li>
                <li>All Pro features remain available with no interruption</li>
                <li>You can cancel or change plans anytime from your billing page</li>
            </ul>
        </td>
    </tr>
</table>

<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
    Want to keep going? No action needed — your Pro access continues seamlessly.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
        <td align="center">
            {self._button("Continue Analyzing Deals", dashboard_url)}
        </td>
    </tr>
    <tr>
        <td align="center" style="padding-top: 8px;">
            <a href="{billing_url}" style="font-size: 14px; color: #71717a; text-decoration: underline;">Manage subscription</a>
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
            receipt_link = f'<a href="{receipt_url}" style="color: #0891b2; font-weight: 600;">View receipt</a>'
        if invoice_pdf_url:
            separator = " &middot; " if receipt_link else ""
            receipt_link += f'{separator}<a href="{invoice_pdf_url}" style="color: #0891b2; font-weight: 600;">Download invoice (PDF)</a>'

        content = f'''
<h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0 0 16px 0;">
    Payment received
</h1>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
    Hi {user_name or "there"}, we received your payment. Here are the details:
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 20px; background-color: #f4f4f5; border-radius: 12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding-bottom: 12px; border-bottom: 1px solid #e4e4e7;">
                        <p style="font-size: 13px; color: #71717a; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Amount</p>
                        <p style="font-size: 28px; font-weight: 700; color: #18181b; margin: 0;">{amount_display}</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding-top: 12px;">
                        <p style="font-size: 13px; color: #71717a; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Description</p>
                        <p style="font-size: 16px; color: #3f3f46; margin: 0;">{description}</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding-top: 12px;">
                        <p style="font-size: 13px; color: #71717a; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Date</p>
                        <p style="font-size: 16px; color: #3f3f46; margin: 0;">{datetime.now().strftime("%B %d, %Y")}</p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<p style="font-size: 14px; color: #71717a; line-height: 1.6; margin: 0 0 8px 0; text-align: center;">
    {receipt_link}
</p>
<p style="font-size: 14px; color: #71717a; line-height: 1.6; margin: 0; text-align: center;">
    Manage billing at your <a href="{billing_url}" style="color: #0891b2;">billing page</a>.
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
        omits the specific dollar figure (e.g. for RevenueCat events
        where the exact charge amount isn't available).
        """
        billing_url = f"{self.frontend_url}/billing"

        if amount_cents:
            amount_display = (
                f"${amount_cents / 100:,.2f}" if currency == "usd" else f"{amount_cents / 100:,.2f} {currency.upper()}"
            )
            amount_sentence = f"your payment of <strong>{amount_display}</strong> for"
            preview_text = f"Action required: payment of {amount_display} failed"
        else:
            amount_sentence = "your payment for"
            preview_text = "Action required: payment failed for your DealGapIQ Pro subscription"

        content = f"""
<h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0 0 16px 0;">
    Payment failed
</h1>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
    We were unable to process {amount_sentence} your DealGapIQ Pro subscription.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: #fef2f2; border-radius: 12px; border-left: 4px solid #dc2626;">
            <p style="font-weight: 600; color: #991b1b; margin: 0 0 8px 0;">What happens now?</p>
            <ul style="font-size: 14px; color: #7f1d1d; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>We'll retry the payment automatically over the next few days</li>
                <li>Your Pro features remain active during this time</li>
                <li>If retries fail, your account will be downgraded to Starter</li>
            </ul>
        </td>
    </tr>
</table>

<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
    Please update your payment method to avoid losing access to Pro features.
</p>

{self._button("Update Payment Method", billing_url, "#dc2626")}

<p style="font-size: 14px; color: #71717a; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
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
<h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0 0 16px 0;">
    Your Pro subscription has ended
</h1>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
    Your DealGapIQ Pro subscription has been canceled. Your account has been moved to the Starter plan.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: #f4f4f5; border-radius: 12px;">
            <p style="font-weight: 600; color: #18181b; margin: 0 0 8px 0;">Your Starter plan includes:</p>
            <ul style="font-size: 14px; color: #3f3f46; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>3 property analyses per month</li>
                <li>Deal Gap, Income Value, and Target Buy metrics</li>
                <li>IQ Verdict Score</li>
                <li>All 6 strategy snapshots</li>
            </ul>
        </td>
    </tr>
</table>

<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
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
<h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0 0 16px 0;">
    You've used all {limit} free analyses this month
</h1>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
    You've reached your monthly limit of {limit} property analyses on your Starter plan. Upgrade to Pro for unlimited analyses and full access to every DealGapIQ tool.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: #f0fdfa; border-radius: 12px; border-left: 4px solid #0891b2;">
            <p style="font-weight: 600; color: #18181b; margin: 0 0 8px 0;">Pro Investor includes:</p>
            <ul style="font-size: 14px; color: #3f3f46; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li><strong>Unlimited</strong> property analyses</li>
                <li>Full calculation breakdowns &amp; stress testing</li>
                <li>Downloadable Excel proformas</li>
                <li>Lender-ready PDF reports</li>
                <li>Side-by-side deal comparison</li>
            </ul>
        </td>
    </tr>
</table>

{self._button("Upgrade to Pro", pricing_url)}

<p style="font-size: 14px; color: #71717a; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
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
        dashboard_url = f"{self.frontend_url}/dashboard"
        billing_url = f"{self.frontend_url}/billing"

        content = f'''
<h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0 0 16px 0;">
    Upgrade confirmed
</h1>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
    Your DealGapIQ account has been upgraded to <strong>{plan_name}</strong>. All Pro features are now active — unlimited analyses, editable inputs, proformas, PDF reports, and more.
</p>

{self._button("Start Analyzing Deals", dashboard_url)}

<p style="font-size: 14px; color: #71717a; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
    Manage your subscription anytime from your <a href="{billing_url}" style="color: #0891b2;">billing page</a>.
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
<h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0 0 16px 0;">
    Your cancellation is scheduled
</h1>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
    Your DealGapIQ Pro subscription has been set to cancel. You'll continue to have full Pro access until <strong>{period_end_date}</strong>, after which your account will move to the Starter plan.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: #fffbeb; border-radius: 12px; border-left: 4px solid #f59e0b;">
            <p style="font-weight: 600; color: #92400e; margin: 0 0 4px 0;">Changed your mind?</p>
            <p style="font-size: 14px; color: #78350f; margin: 0;">
                You can reactivate your subscription anytime before <strong>{period_end_date}</strong> from your
                <a href="{billing_url}" style="color: #d97706; font-weight: 600;">billing page</a> — no interruption in service.
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
<h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0 0 16px 0;">
    New sign-in to your account
</h1>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
    We detected a sign-in to your DealGapIQ account from a device we don't recognise.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: #f4f4f5; border-radius: 12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding-bottom: 8px;">
                        <p style="font-size: 13px; color: #71717a; margin: 0;">Device</p>
                        <p style="font-size: 15px; color: #18181b; margin: 4px 0 0 0;">{device_info}</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding-bottom: 8px;">
                        <p style="font-size: 13px; color: #71717a; margin: 0;">IP Address</p>
                        <p style="font-size: 15px; color: #18181b; margin: 4px 0 0 0;">{ip_address or "Unknown"}</p>
                    </td>
                </tr>
                <tr>
                    <td>
                        <p style="font-size: 13px; color: #71717a; margin: 0;">Time</p>
                        <p style="font-size: 15px; color: #18181b; margin: 4px 0 0 0;">{time_display}</p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
    If this was you, no action is needed. If you don't recognise this activity, secure your account immediately.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: #fef2f2; border-radius: 12px; border-left: 4px solid #dc2626;">
            <p style="font-weight: 600; color: #991b1b; margin: 0 0 8px 0;">This wasn't me</p>
            <ul style="font-size: 14px; color: #7f1d1d; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li><a href="{reset_url}" style="color: #dc2626; font-weight: 600;">Reset your password</a> immediately</li>
                <li><a href="{sessions_url}" style="color: #dc2626; font-weight: 600;">Review active sessions</a> and revoke any you don't recognise</li>
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

    async def send_mfa_enabled_email(
        self,
        to: str,
        user_name: str,
    ) -> dict[str, Any]:
        """Confirm that two-factor authentication was enabled."""
        content = f'''
<h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0 0 16px 0;">
    Two-factor authentication enabled
</h1>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
    Two-factor authentication (2FA) has been successfully enabled on your DealGapIQ account. You'll now need your authenticator app each time you sign in.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: #f0fdf4; border-radius: 12px; border-left: 4px solid #22c55e;">
            <p style="font-weight: 600; color: #166534; margin: 0 0 4px 0;">Your account is now more secure</p>
            <p style="font-size: 14px; color: #15803d; margin: 0;">
                Keep your authenticator app and backup codes in a safe place. If you lose access, contact support.
            </p>
        </td>
    </tr>
</table>

<p style="font-size: 14px; color: #71717a; line-height: 1.6; margin: 24px 0 0 0;">
    Changed: {datetime.now().strftime("%B %d, %Y at %I:%M %p")} UTC
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px;">
    <tr>
        <td style="padding: 16px; background-color: #fef2f2; border-radius: 12px; border-left: 4px solid #dc2626;">
            <p style="font-size: 14px; color: #991b1b; margin: 0;">
                If you did not make this change, <a href="{self.frontend_url}/forgot-password" style="color: #dc2626; font-weight: 600;">reset your password immediately</a> and contact support.
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
<h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0 0 16px 0;">
    Two-factor authentication disabled
</h1>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
    Two-factor authentication (2FA) has been removed from your DealGapIQ account. Your account is now protected by your password only.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: #fffbeb; border-radius: 12px; border-left: 4px solid #f59e0b;">
            <p style="font-weight: 600; color: #92400e; margin: 0 0 4px 0;">Your account security has been reduced</p>
            <p style="font-size: 14px; color: #78350f; margin: 0;">
                We recommend keeping 2FA enabled. You can re-enable it anytime from your
                <a href="{self.frontend_url}/profile" style="color: #d97706; font-weight: 600;">profile settings</a>.
            </p>
        </td>
    </tr>
</table>

<p style="font-size: 14px; color: #71717a; line-height: 1.6; margin: 24px 0 0 0;">
    Changed: {datetime.now().strftime("%B %d, %Y at %I:%M %p")} UTC
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px;">
    <tr>
        <td style="padding: 16px; background-color: #fef2f2; border-radius: 12px; border-left: 4px solid #dc2626;">
            <p style="font-size: 14px; color: #991b1b; margin: 0;">
                If you did not make this change, your account may be compromised. <a href="{self.frontend_url}/forgot-password" style="color: #dc2626; font-weight: 600;">Reset your password immediately</a>.
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
            date_note = f" Your data will be permanently deleted on <strong>{deletion_date}</strong>."

        content = f'''
<h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0 0 16px 0;">
    Account deletion confirmed
</h1>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
    Your DealGapIQ account has been scheduled for deletion.{date_note}
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: #f4f4f5; border-radius: 12px;">
            <p style="font-weight: 600; color: #18181b; margin: 0 0 8px 0;">What will be removed:</p>
            <ul style="font-size: 14px; color: #3f3f46; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Your account credentials and profile</li>
                <li>Saved properties and analysis history</li>
                <li>Subscription and payment records</li>
                <li>All associated data</li>
            </ul>
        </td>
    </tr>
</table>

<p style="font-size: 14px; color: #71717a; line-height: 1.6; margin: 0;">
    If you did not request this, contact <a href="mailto:support@dealgapiq.com" style="color: #0891b2;">support@dealgapiq.com</a> immediately to cancel the deletion.
</p>
<p style="font-size: 14px; color: #71717a; line-height: 1.6; margin: 8px 0 0 0;">
    You can sign up again anytime at <a href="{self.frontend_url}" style="color: #0891b2;">dealgapiq.com</a>.
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
<h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0 0 16px 0;">
    You're {total_steps - steps_remaining} of {total_steps} steps in
</h1>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
    You're almost ready to start analyzing deals. Finish setting up your investor profile so DealGapIQ can tailor results to your strategy, budget, and target markets.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: #f0fdfa; border-radius: 12px; border-left: 4px solid #0891b2;">
            <p style="font-weight: 600; color: #18181b; margin: 0 0 8px 0;">What you'll unlock:</p>
            <ul style="font-size: 14px; color: #3f3f46; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Personalised deal analysis tuned to your goals</li>
                <li>IQ Verdict Score calibrated to your risk tolerance</li>
                <li>Strategy recommendations for your experience level</li>
            </ul>
        </td>
    </tr>
</table>

<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 8px 0;">
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
<h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0 0 16px 0;">
    Your first deal analysis is in the books
</h1>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
    You just analyzed <strong>{property_address}</strong> — that's the hardest part done. Every serious investor starts by running the numbers, and now you have a data-backed verdict on your first deal.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: #faf5ff; border-radius: 12px; border-left: 4px solid #8b5cf6;">
            <p style="font-weight: 600; color: #18181b; margin: 0 0 8px 0;">Want to go deeper? Pro Investor unlocks:</p>
            <ul style="font-size: 14px; color: #3f3f46; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Unlimited analyses (no monthly cap)</li>
                <li>Editable inputs &amp; stress testing</li>
                <li>Downloadable Excel proformas</li>
                <li>Lender-ready PDF reports</li>
            </ul>
        </td>
    </tr>
</table>

{self._button("Analyze Another Property", search_url)}

<p style="font-size: 14px; color: #71717a; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
    Ready for unlimited access? <a href="{pricing_url}" style="color: #0891b2; font-weight: 600;">View Pro plans</a>
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
<h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0 0 16px 0;">
    Deals don't wait — neither should you
</h1>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
    It's been {days_inactive} days since your last visit. The market keeps moving — new listings, price drops, and opportunities are popping up every day.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: #f0fdfa; border-radius: 12px; border-left: 4px solid #0891b2;">
            <p style="font-weight: 600; color: #18181b; margin: 0 0 8px 0;">Pick up where you left off</p>
            <ul style="font-size: 14px; color: #3f3f46; margin: 0; padding-left: 20px; line-height: 1.8;">
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
<h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0 0 16px 0;">
    Your Pro tools are still here
</h1>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
    We noticed you recently canceled your DealGapIQ Pro subscription. If you're still actively investing, here's what you're missing:
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
    <tr>
        <td style="padding: 16px; background-color: #f4f4f5; border-radius: 12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding-bottom: 12px; border-bottom: 1px solid #e4e4e7;">
                        <p style="font-size: 14px; color: #3f3f46; margin: 0;">
                            <strong>Unlimited analyses</strong> — your Starter plan limits you to 3 per month
                        </p>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7;">
                        <p style="font-size: 14px; color: #3f3f46; margin: 0;">
                            <strong>Editable inputs &amp; stress testing</strong> — change any variable, recalculate instantly
                        </p>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7;">
                        <p style="font-size: 14px; color: #3f3f46; margin: 0;">
                            <strong>Excel proformas &amp; PDF reports</strong> — download and share with lenders
                        </p>
                    </td>
                </tr>
                <tr>
                    <td style="padding-top: 12px;">
                        <p style="font-size: 14px; color: #3f3f46; margin: 0;">
                            <strong>Side-by-side comparison</strong> — evaluate multiple deals at once
                        </p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
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
<h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0 0 16px 0;">
    Your annual subscription renews soon
</h1>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
    Your DealGapIQ Pro annual subscription will automatically renew on <strong>{renewal_date}</strong>.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 20px; background-color: #f4f4f5; border-radius: 12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding-bottom: 12px; border-bottom: 1px solid #e4e4e7;">
                        <p style="font-size: 13px; color: #71717a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Renewal amount</p>
                        <p style="font-size: 28px; font-weight: 700; color: #18181b; margin: 4px 0 0 0;">{amount_display}</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding-top: 12px;">
                        <p style="font-size: 13px; color: #71717a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Renewal date</p>
                        <p style="font-size: 16px; color: #3f3f46; margin: 4px 0 0 0;">{renewal_date}</p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
    No action needed if you'd like to continue. Your Pro access will renew automatically.
</p>

{self._button("Manage Subscription", billing_url)}

<p style="font-size: 14px; color: #71717a; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
    To cancel or change plans, visit your <a href="{billing_url}" style="color: #0891b2;">billing page</a> before {renewal_date}.
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
<tr><td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7;">
    <span style="color: #71717a;">Properties analysed</span></td>
    <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; text-align: right; font-weight: 600; color: #18181b;">{analyses_count}</td></tr>"""
        if saved_count:
            rows += f"""
<tr><td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7;">
    <span style="color: #71717a;">Properties saved</span></td>
    <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; text-align: right; font-weight: 600; color: #18181b;">{saved_count}</td></tr>"""
        if price_drops:
            rows += f"""
<tr><td style="padding: 8px 0;">
    <span style="color: #71717a;">Saved properties with price drops</span></td>
    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #22c55e;">{price_drops}</td></tr>"""

        content = f'''
<h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0 0 16px 0;">
    Your {period} digest
</h1>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
    Hi {user_name or "there"}, here's a snapshot of your DealGapIQ activity.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 20px; background-color: #f4f4f5; border-radius: 12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                {rows or '<tr><td style="padding: 8px 0; color: #71717a;">No activity this period — search a property to get started.</td></tr>'}
            </table>
        </td>
    </tr>
</table>

{self._button("Search a Property", search_url)}

<p style="font-size: 14px; color: #71717a; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
    <a href="{saved_url}" style="color: #0891b2;">View saved properties</a>
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
<h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0 0 16px 0;">
    New: {feature_name}
</h1>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
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
<h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0 0 16px 0;">
    Property Alert: {alert_type}
</h1>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 16px 0;">
    There's an update for one of your saved properties:
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
    <tr>
        <td style="padding: 16px; background-color: #f4f4f5; border-radius: 12px;">
            <p style="font-weight: 600; color: #18181b; margin: 0 0 8px 0;">📍 {property_address}</p>
            <p style="font-size: 14px; color: #3f3f46; margin: 0;">{details}</p>
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
