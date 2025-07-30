from typing import Optional
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class EmailService:
    """Email service for sending verification and notification emails"""
    
    @staticmethod
    def generate_verification_token() -> str:
        """Generate a secure random verification token"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    async def send_verification_email(email: str, token: str, base_url: str) -> bool:
        """Send verification email to user"""
        
        # For development, just log the verification link
        if settings.ENVIRONMENT == "development":
            verification_link = f"{base_url}/verify-email?token={token}"
            logger.info(f"Email verification link for {email}: {verification_link}")
            print(f"\n📧 Email Verification Link (dev mode):\n{verification_link}\n")
            return True
        
        # Production email sending would go here
        # You would integrate with services like:
        # - SendGrid
        # - AWS SES
        # - Mailgun
        # - Postmark
        
        try:
            # Example with SMTP (you'd configure with your email service)
            subject = "Verify your SecureShare Pro account"
            
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background-color: #0f0f0f;
                        color: #e0e0e0;
                        margin: 0;
                        padding: 0;
                    }}
                    .container {{
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 40px 20px;
                    }}
                    .card {{
                        background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                        border-radius: 16px;
                        padding: 40px;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                        border: 1px solid #333;
                    }}
                    .logo {{
                        text-align: center;
                        margin-bottom: 30px;
                    }}
                    h1 {{
                        background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        font-size: 28px;
                        margin: 0 0 20px 0;
                        text-align: center;
                    }}
                    .content {{
                        line-height: 1.6;
                        color: #b0b0b0;
                        margin-bottom: 30px;
                    }}
                    .button {{
                        display: inline-block;
                        background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                        color: white;
                        padding: 14px 32px;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: 600;
                        text-align: center;
                        margin: 20px auto;
                        display: block;
                        width: fit-content;
                        box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
                        transition: all 0.3s ease;
                    }}
                    .footer {{
                        text-align: center;
                        color: #666;
                        font-size: 14px;
                        margin-top: 40px;
                    }}
                    .magic {{
                        background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899, #3b82f6);
                        background-size: 300% 100%;
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        animation: gradient 3s ease infinite;
                    }}
                    @keyframes gradient {{
                        0% {{ background-position: 0% 50%; }}
                        50% {{ background-position: 100% 50%; }}
                        100% {{ background-position: 0% 50%; }}
                    }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="logo">
                            <div style="font-size: 48px;">☁️</div>
                        </div>
                        <h1>Welcome to SecureShare Pro!</h1>
                        <div class="content">
                            <p>Hi there! 👋</p>
                            <p>Thanks for signing up for SecureShare Pro. You're just one click away from unlocking secure, lightning-fast file sharing.</p>
                            <p>Please verify your email address to get started:</p>
                        </div>
                        <a href="{base_url}/verify-email?token={token}" class="button">
                            ✨ Verify Email Address
                        </a>
                        <div class="content">
                            <p style="font-size: 14px; color: #666;">
                                This link will expire in 24 hours. If you didn't sign up for SecureShare Pro, you can safely ignore this email.
                            </p>
                        </div>
                        <div class="footer">
                            <p class="magic">✨ Secure • Fast • Magical ✨</p>
                            <p style="color: #555;">© 2024 SecureShare Pro. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # This is where you'd actually send the email
            # For now, we'll just return True in development
            return True
            
        except Exception as e:
            logger.error(f"Failed to send verification email: {e}")
            return False
    
    @staticmethod
    async def send_password_reset_email(email: str, code: str) -> bool:
        """Send password reset email with 6-digit code"""
        
        if settings.ENVIRONMENT == "development":
            logger.info(f"Password reset code for {email}: {code}")
            print(f"\n🔐 Password Reset Code (dev mode):")
            print(f"Email: {email}")
            print(f"Code: {code}")
            print(f"Valid for: 15 minutes\n")
            return True
        
        try:
            subject = "Reset your SecureShare Pro password"
            
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background-color: #0a0a0a;
                        color: #e0e0e0;
                        margin: 0;
                        padding: 0;
                    }}
                    .container {{
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 40px 20px;
                    }}
                    .card {{
                        background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                        border-radius: 16px;
                        padding: 40px;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                        border: 1px solid #333;
                    }}
                    .logo {{
                        text-align: center;
                        margin-bottom: 30px;
                    }}
                    h1 {{
                        background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        font-size: 28px;
                        margin: 0 0 20px 0;
                        text-align: center;
                    }}
                    .code-box {{
                        background: #0a0a0a;
                        border: 2px solid #3b82f6;
                        border-radius: 12px;
                        padding: 30px;
                        text-align: center;
                        margin: 30px 0;
                    }}
                    .code {{
                        font-size: 48px;
                        font-weight: bold;
                        letter-spacing: 12px;
                        color: #3b82f6;
                        font-family: 'Courier New', monospace;
                    }}
                    .content {{
                        line-height: 1.6;
                        color: #b0b0b0;
                        margin-bottom: 20px;
                    }}
                    .footer {{
                        text-align: center;
                        color: #666;
                        font-size: 14px;
                        margin-top: 40px;
                    }}
                    .warning {{
                        background: rgba(239, 68, 68, 0.1);
                        border: 1px solid rgba(239, 68, 68, 0.3);
                        border-radius: 8px;
                        padding: 15px;
                        margin: 20px 0;
                        color: #fca5a5;
                    }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="logo">
                            <div style="font-size: 48px;">🔐</div>
                        </div>
                        <h1>Password Reset Request</h1>
                        <div class="content">
                            <p>Hi there,</p>
                            <p>We received a request to reset your SecureShare Pro password. Use the code below to reset your password:</p>
                        </div>
                        <div class="code-box">
                            <div class="code">{code}</div>
                        </div>
                        <div class="content">
                            <p><strong>This code expires in 15 minutes.</strong></p>
                            <p>Enter this code on the password reset page to create a new password.</p>
                        </div>
                        <div class="warning">
                            <p><strong>⚠️ Security Notice:</strong></p>
                            <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
                        </div>
                        <div class="footer">
                            <p style="color: #555;">© 2024 SecureShare Pro. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Here you would send the actual email
            # For now, return True
            return True
            
        except Exception as e:
            logger.error(f"Failed to send password reset email: {e}")
            return False
    
    @staticmethod
    async def send_share_email(**kwargs) -> bool:
        """Send file/collection share email"""
        
        is_collection = kwargs.get('is_collection', False)
        
        # Format file size
        def format_bytes(bytes_size):
            for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
                if bytes_size < 1024.0:
                    return f"{bytes_size:.1f} {unit}"
                bytes_size /= 1024.0
            return f"{bytes_size:.1f} PB"
        
        if settings.ENVIRONMENT == "development":
            if is_collection:
                share_link = kwargs['collection_url']
                logger.info(f"Collection share link for {kwargs['recipient_email']}: {share_link}")
                print(f"\n📁 Collection Share Link (dev mode):")
                print(f"To: {kwargs['recipient_email']}")
                print(f"From: {kwargs['sender_name']} ({kwargs.get('sender_email', 'N/A')})")
                print(f"Collection: {kwargs['collection_name']} ({kwargs['file_count']} files, {format_bytes(kwargs['total_size'])})")
                if kwargs.get('message'):
                    print(f"Message: {kwargs['message']}")
                print(f"Link: {share_link}\n")
            else:
                share_link = kwargs['download_url']
                logger.info(f"File share link for {kwargs['recipient_email']}: {share_link}")
                print(f"\n📄 File Share Link (dev mode):")
                print(f"To: {kwargs['recipient_email']}")
                print(f"From: {kwargs['sender_name']} ({kwargs.get('sender_email', 'N/A')})")
                print(f"File: {kwargs['file_name']} ({format_bytes(kwargs['file_size'])})")
                print(f"Expires: {kwargs['expires_at'].strftime('%B %d, %Y at %I:%M %p')}")
                if kwargs.get('message'):
                    print(f"Message: {kwargs['message']}")
                print(f"Link: {share_link}\n")
            return True
        
        # Production email sending
        try:
            if is_collection:
                subject = f"{kwargs['sender_name']} shared a collection with you"
                item_type = "collection"
                item_name = kwargs['collection_name']
                item_details = f"{kwargs['file_count']} files • {format_bytes(kwargs['total_size'])}"
                download_url = kwargs['collection_url']
                button_text = "View Collection"
            else:
                subject = f"{kwargs['sender_name']} sent you a file"
                item_type = "file"
                item_name = kwargs['file_name']
                item_details = f"Size: {format_bytes(kwargs['file_size'])}<br>Expires: {kwargs['expires_at'].strftime('%B %d, %Y at %I:%M %p')}"
                download_url = kwargs['download_url']
                button_text = "Download File"
            
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background-color: #f5f5f5;
                        color: #333;
                        margin: 0;
                        padding: 0;
                    }}
                    .container {{
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 40px 20px;
                    }}
                    .card {{
                        background: white;
                        border-radius: 16px;
                        padding: 40px;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                    }}
                    .header {{
                        text-align: center;
                        margin-bottom: 30px;
                    }}
                    .logo {{
                        font-size: 48px;
                        margin-bottom: 10px;
                    }}
                    h1 {{
                        color: #8B5CF6;
                        font-size: 28px;
                        margin: 0 0 30px 0;
                    }}
                    .file-info {{
                        background-color: #f8f9fa;
                        border: 1px solid #e9ecef;
                        border-radius: 12px;
                        padding: 20px;
                        margin: 20px 0;
                    }}
                    .file-icon {{
                        font-size: 32px;
                        margin-bottom: 10px;
                    }}
                    .message-box {{
                        background-color: #e8f4fd;
                        border-left: 4px solid #2196F3;
                        padding: 15px;
                        border-radius: 8px;
                        margin: 20px 0;
                    }}
                    .button {{
                        display: inline-block;
                        background-color: #8B5CF6;
                        color: white;
                        padding: 14px 40px;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: 600;
                        text-align: center;
                        margin: 30px auto;
                        display: block;
                        width: fit-content;
                    }}
                    .footer {{
                        text-align: center;
                        color: #666;
                        font-size: 12px;
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid #e9ecef;
                    }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="header">
                            <div class="logo">☁️</div>
                            <h1>SecureShare Pro</h1>
                        </div>
                        
                        <p>Hi{f" {kwargs['recipient_name']}" if kwargs.get('recipient_name') else ''},</p>
                        
                        <p>{kwargs['sender_name']} has shared a {item_type} with you using SecureShare Pro.</p>
                        
                        {f'''<div class="message-box">
                            <strong>Message from {kwargs['sender_name']}:</strong><br>
                            {kwargs['message']}
                        </div>''' if kwargs.get('message') else ''}
                        
                        <div class="file-info">
                            <div class="file-icon">{'📁' if is_collection else '📄'}</div>
                            <h3 style="margin: 0 0 10px 0;">{item_name}</h3>
                            <p style="margin: 5px 0; color: #666;">{item_details}</p>
                            {f'<p style="margin: 5px 0; color: #ff6b6b;">🔒 Password protected</p>' if kwargs.get('has_password') else ''}
                        </div>
                        
                        <a href="{download_url}" class="button">{button_text}</a>
                        
                        <p style="text-align: center; color: #666; font-size: 14px;">
                            Or copy this link:<br>
                            <a href="{download_url}" style="color: #8B5CF6; word-break: break-all;">{download_url}</a>
                        </p>
                        
                        <div class="footer">
                            <p>This email was sent by SecureShare Pro on behalf of {kwargs.get('sender_email') or kwargs['sender_name']}.</p>
                            <p>© 2024 SecureShare Pro. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Here you would send the actual email using your email service
            # For now, return True
            return True
            
        except Exception as e:
            logger.error(f"Failed to send share email: {e}")
            return False