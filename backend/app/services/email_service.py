import smtplib, os, html as html_lib, re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from app.core.config import settings

def markdown_to_html(text: str) -> str:
    if not text:
        return ""
    # Check if the raw text contains block layout or HTML tags to conditionally handle newlines
    has_html_blocks = bool(re.search(r'<(div|p|ul|ol|li|br|a)\b', text, re.IGNORECASE))

    # 1. Escape HTML entities first to prevent arbitrary HTML injection (preserve quotes for tag attributes)
    escaped = html_lib.escape(text, quote=False)
    
    # 2. Restore allowed formatting tags case-insensitively with attributes
    escaped = re.sub(r'&lt;(b|strong|em|i|u|div|p|ul|ol|li|br|span|a)\b(.*?)&gt;', r'<\1\2>', escaped, flags=re.IGNORECASE)
    escaped = re.sub(r'&lt;/(b|strong|em|i|u|div|p|ul|ol|li|br|span|a)&gt;', r'</\1>', escaped, flags=re.IGNORECASE)
    escaped = escaped.replace("&amp;nbsp;", "&nbsp;")

    # 3. Bold **text** (for markdown compatibility)
    escaped = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', escaped)
    # 4. Italic *text* (for markdown compatibility)
    escaped = re.sub(r'\*(.*?)\*', r'<em>\1</em>', escaped)
    # 5. Links [text](url) (for markdown compatibility)
    escaped = re.sub(r'\[(.*?)\]\((.*?)\)', r'<a href="\2" style="color: #2563eb; text-decoration: underline;">\1</a>', escaped)
    
    # 6. Newlines to <br/>
    if not has_html_blocks:
        escaped = escaped.replace("\n", "<br/>")
    else:
        escaped = escaped.replace("\n", "")
        
    # Wrap in standard email container
    return f"<div style='font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333333;'>{escaped}</div>"

def send_email(to: str, subject: str, body: str, attachment_path: str = None, attachment_name: str = None) -> bool:
    # Fallback to mock mode if using default placeholder configuration
    if not settings.SMTP_USER or settings.SMTP_USER == "your@gmail.com":
        print("\n=== [MOCK EMAIL SENT] ===")
        print(f"To: {to}")
        print(f"Subject: {subject}")
        print(f"Body:\n{body}")
        if attachment_path:
            print(f"Attachment Name: {attachment_name} (stored at: {attachment_path})")
        print("=========================\n")
        return True

    try:
        msg = MIMEMultipart()
        msg["From"] = settings.SMTP_USER
        msg["To"] = to
        msg["Subject"] = subject
        msg.attach(MIMEText(markdown_to_html(body), "html"))

        if attachment_path and os.path.exists(attachment_path):
            filename = attachment_name or os.path.basename(attachment_path)
            with open(attachment_path, "rb") as f:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(f.read())
            encoders.encode_base64(part)
            part.add_header(
                "Content-Disposition",
                f"attachment; filename={filename}",
            )
            msg.attach(part)

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, to, msg.as_string())
        return True
    except Exception as e:
        print(f"Email error: {e}")
        return False


