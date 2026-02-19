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
        self.from_email = os.getenv("EMAIL_FROM", "DealGapIQ <noreply@dealgapiq.com>")
        self.frontend_url = os.getenv("FRONTEND_URL", "https://dealgapiq.com")
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
    ) -> Dict[str, Any]:
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
        trial_end_date: Optional[str] = None,
    ) -> Dict[str, Any]:
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
    ) -> Dict[str, Any]:
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
        receipt_url: Optional[str] = None,
        invoice_pdf_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send payment receipt after successful charge."""
        billing_url = f"{self.frontend_url}/billing"
        amount_display = f"${amount_cents / 100:,.2f}" if currency == "usd" else f"{amount_cents / 100:,.2f} {currency.upper()}"
        
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
        amount_cents: int,
        currency: str,
    ) -> Dict[str, Any]:
        """Send notification when a payment fails."""
        billing_url = f"{self.frontend_url}/billing"
        amount_display = f"${amount_cents / 100:,.2f}" if currency == "usd" else f"{amount_cents / 100:,.2f} {currency.upper()}"
        
        content = f'''
<h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0 0 16px 0;">
    Payment failed
</h1>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 8px 0;">
    Hi {user_name or "there"},
</p>
<p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
    We were unable to process your payment of <strong>{amount_display}</strong> for your DealGapIQ Pro subscription.
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
'''
        
        html = self._base_template(content, f"Action required: payment of {amount_display} failed")
        
        return await self.send_email(
            to=to,
            subject=f"Payment failed - action required - DealGapIQ",
            html=html,
        )
    
    async def send_subscription_canceled_email(
        self,
        to: str,
        user_name: str,
    ) -> Dict[str, Any]:
        """Send confirmation when subscription is fully canceled."""
        pricing_url = f"{self.frontend_url}/pricing"
        
        content = f'''
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
                <li>5 property analyses per month</li>
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
'''
        
        html = self._base_template(content, "Your DealGapIQ Pro subscription has ended")
        
        return await self.send_email(
            to=to,
            subject="Your Pro subscription has ended - DealGapIQ",
            html=html,
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
            subject=f"Property Alert: {alert_type} - DealGapIQ",
            html=html,
        )


# Singleton instance
email_service = EmailService()

