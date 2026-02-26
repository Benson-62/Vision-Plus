import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv
import logging

load_dotenv()

SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

logger = logging.getLogger(__name__)

def send_otp_email(to_email: str, otp: str):
    """
    Sends an OTP to the specified email address using SMTP.
    If SMTP credentials are not configured, it logs the OTP for testing.
    """
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        logger.warning(f"SMTP credentials not configured. Mock sending OTP {otp} to {to_email}")
        print(f"\n[{'*'*40}]\n[MOCK EMAIL] To: {to_email}\n[MOCK EMAIL] OTP: {otp}\n[{'*'*40}]\n")
        return True

    msg = MIMEMultipart()
    msg['From'] = SMTP_USERNAME
    msg['To'] = to_email
    msg['Subject'] = "Smart Attendance - Password Reset OTP"

    body = f"""
    Hello,

    You requested to reset your password for the Smart Attendance system.
    
    Your One-Time Password (OTP) is: {otp}
    
    This OTP is valid for 15 minutes. If you did not request a password reset, please ignore this email.

    Regards,
    Smart Attendance System
    """
    msg.attach(MIMEText(body, 'plain'))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        logger.info(f"OTP email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        # In a real app we might want to raise this to inform the user,
        # but for now we'll just log it so the app doesn't crash if their SMTP is wrong initially
        return False
