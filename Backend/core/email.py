import os
import smtplib
from email.message import EmailMessage
import json

SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_USERNAME = os.environ.get("SMTP_USERNAME", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")

def send_performance_report_email(to_email: str, username: str, session_data: dict):
    """
    Sends an automated HTML email report to the student.
    If SMTP credentials are not set, it will print the email to the console for testing.
    """
    subject = "Your SpeakX-Pro Session Analytics are Ready!"
    
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4F46E5;">Hi {username},</h2>
        <p>Your recent public speaking session has been successfully analyzed by our AI coach!</p>
        
        <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #111827;">Performance Snapshot</h3>
            <ul style="list-style-type: none; padding-left: 0;">
                <li style="margin-bottom: 10px;"><strong>Overall Score:</strong> <span style="font-size: 18px; color: #4F46E5;">{session_data.get('overall_score', 0)}/100</span></li>
                <li style="margin-bottom: 10px;"><strong>Confidence:</strong> {session_data.get('confidence_score', 0)}/100</li>
                <li style="margin-bottom: 10px;"><strong>Fluency:</strong> {session_data.get('fluency_score', 0)}/100</li>
                <li style="margin-bottom: 10px;"><strong>Eye Contact:</strong> {session_data.get('eye_contact_pct', 0)}%</li>
            </ul>
        </div>
        
        <h3 style="color: #111827;">AI Feedback Summary:</h3>
        <p style="white-space: pre-wrap; background-color: #FAFAFA; padding: 15px; border-left: 4px solid #4F46E5;">{session_data.get('feedback', '')}</p>
        
        <p style="margin-top: 30px;">
            Log in to your <a href="http://localhost:5173" style="color: #4F46E5; text-decoration: none; font-weight: bold;">SpeakX-Pro Dashboard</a> to chat with your AI Coach and review detailed metrics.
        </p>
        <p style="color: #6B7280; font-size: 12px; margin-top: 40px;">
            This is an automated message from SpeakX-Pro Enterprise.
        </p>
      </body>
    </html>
    """

    # If no SMTP credentials, just print for testing
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        print("\n" + "="*50)
        print(f"MOCK EMAIL DISPATCH TO: {to_email}")
        print(f"SUBJECT: {subject}")
        print("BODY PREVIEW:")
        print(html_content)
        print("="*50 + "\n")
        return

    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = SMTP_USERNAME
    msg['To'] = to_email
    msg.set_content("Please enable HTML to view your report.")
    msg.add_alternative(html_content, subtype='html')

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
        print(f"Email successfully sent to {to_email}")
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")
