"""
Email Service for sending transactional emails via Resend.
"""

import logging
import os
from typing import Optional, List, Dict, Any
from datetime import datetime

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
        self.api_key = os.getenv("RESEND_API_KEY")
        self.from_email = os.getenv("EMAIL_FROM", "InvestIQ <noreply@investiq.app>")
        self.frontend_url = os.getenv("FRONTEND_URL", "https://investiq.app")
        self.is_configured = bool(self.api_key and RESEND_AVAILABLE)
        
        if self.is_configured:
            resend.api_key = self.api_key
            logger.info("Email service initialized with Resend")
        else:
            logger.warning("Email service running in dev mode (no emails will be sent)")
    
    async def send_email(
        self,
        to: str | List[str],
        subject: str,
        html: str,
        text: Optional[str] = None,
        reply_to: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send an email via Resend.
        
        Args:
            to: Recipient email(s)
            subject: Email subject
            html: HTML body
            text: Plain text body (optional)
            reply_to: Reply-to address (optional)
        
        Returns:
            Response from Resend API or mock response
        """
        if not self.is_configured:
            # Log email in dev mode
            logger.info(f"[DEV EMAIL] To: {to} | Subject: {subject}")
            logger.debug(f"[DEV EMAIL] Body: {html[:200]}...")
            return {"id": "dev-mode", "success": True}
        
        try:
            params = {
                "from": self.from_email,
                "to": [to] if isinstance(to, str) else to,
                "subject": subject,
                "html": html,
            }
            
            if text:
                params["text"] = text
            if reply_to:
                params["reply_to"] = reply_to
            
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
        return f'''
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>InvestIQ</title>
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
                                        <span style="font-size: 24px; font-weight: bold; color: white; letter-spacing: -0.5px;">InvestIQ</span>
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
                                © {datetime.now().year} InvestIQ. All rights reserved.
                            </p>
                            <p style="font-size: 12px; color: #a1a1aa; margin: 0;">
                                You're receiving this email because you have an InvestIQ account.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
'''
    
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
    # Transactional Emails
    # ===========================================
    
    async def send_verification_email(
        self,
        to: str,
        user_name: str,
        verification_token: str,
    ) -> Dict[str, Any]:
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
    Thanks for signing up for InvestIQ! Please verify your email address by clicking the button below.
</p>

{self._button("Verify Email Address", verification_url)}

<p style="font-size: 14px; color: #71717a; line-height: 1.6; margin: 24px 0 0 0;">
    If you didn't create an account with InvestIQ, you can safely ignore this email.
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
        
        html = self._base_template(content, "Verify your email to get started with InvestIQ")
        
        return await self.send_email(
            to=to,
            subject="Verify your email address - InvestIQ",
            html=html,
        )
    
    async def send_password_reset_email(
        self,
        to: str,
        user_name: str,
        reset_token: str,
    ) -> Dict[str, Any]:
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
    We received a request to reset the password for your InvestIQ account. Click the button below to create a new password.
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
        
        html = self._base_template(content, "Reset your InvestIQ password")
        
        return await self.send_email(
            to=to,
            subject="Reset your password - InvestIQ",
            html=html,
        )
    
    async def send_welcome_email(
        self,
        to: str,
        user_name: str,
    ) -> Dict[str, Any]:
        """Send welcome email after verification."""
        dashboard_url = f"{self.frontend_url}/dashboard"
        strategies_url = f"{self.frontend_url}/strategies"
        
        content = f'''
<h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0 0 16px 0;">
    Welcome to InvestIQ! 🎉
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
        
        html = self._base_template(content, "Your InvestIQ account is ready!")
        
        return await self.send_email(
            to=to,
            subject="Welcome to InvestIQ! 🎉",
            html=html,
        )
    
    async def send_password_changed_email(
        self,
        to: str,
        user_name: str,
    ) -> Dict[str, Any]:
        """Send notification that password was changed."""
        content = f'''
<h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0 0 16px 0;">
    Password changed
</h1>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
    Your InvestIQ password was successfully changed. If you made this change, you can safely ignore this email.
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
        
        html = self._base_template(content, "Your InvestIQ password was changed")
        
        return await self.send_email(
            to=to,
            subject="Your password was changed - InvestIQ",
            html=html,
        )
    
    async def send_property_alert_email(
        self,
        to: str,
        user_name: str,
        property_address: str,
        alert_type: str,
        details: str,
    ) -> Dict[str, Any]:
        """Send property alert notification."""
        property_url = f"{self.frontend_url}/property?address={property_address}"
        
        content = f'''
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
'''
        
        html = self._base_template(content, f"Alert: {alert_type} for {property_address}")
        
        return await self.send_email(
            to=to,
            subject=f"Property Alert: {alert_type} - InvestIQ",
            html=html,
        )


# Singleton instance
email_service = EmailService()

