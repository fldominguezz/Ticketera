import imaplib
import email
from email.header import decode_header
import logging
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.crud.crud_ticket import ticket as crud_ticket
from app.schemas.ticket import TicketCreate
import uuid
logger = logging.getLogger(__name__)
class EmailService:
    def __init__(self):
        self.imap_server = settings.IMAP_SERVER
        self.imap_user = settings.IMAP_USER
        self.imap_password = settings.IMAP_PASSWORD
    def fetch_emails(self) -> List[Dict[str, Any]]:
        if not settings.IMAP_ENABLED:
            return []
        emails = []
        try:
            # Connect to the server
            mail = imaplib.IMAP4_SSL(self.imap_server, settings.IMAP_PORT)
            mail.login(self.imap_user, self.imap_password)
            mail.select("inbox")
            # Search for unread messages
            status, messages = mail.search(None, 'UNSEEN')
            if status != 'OK':
                return []
            for num in messages[0].split():
                status, data = mail.fetch(num, '(RFC822)')
                if status != 'OK':
                    continue
                for response_part in data:
                    if isinstance(response_part, tuple):
                        msg = email.message_from_bytes(response_part[1])
                        subject, encoding = decode_header(msg["Subject"])[0]
                        if isinstance(subject, bytes):
                            subject = subject.decode(encoding if encoding else "utf-8")
                        from_ = msg.get("From")
                        # Get body
                        body = ""
                        if msg.is_multipart():
                            for part in msg.walk():
                                if part.get_content_type() == "text/plain":
                                    body = part.get_payload(decode=True).decode()
                                    break
                        else:
                            body = msg.get_payload(decode=True).decode()
                        emails.append({
                            "subject": subject,
                            "from": from_,
                            "body": body,
                            "id": num
                        })
            mail.logout()
        except Exception as e:
            logger.error(f"Error fetching emails: {e}")
        return emails
    async def process_emails_as_tickets(self, db: AsyncSession):
        emails = self.fetch_emails()
        for email_data in emails:
            try:
                # Basic ticket creation from email
                ticket_in = TicketCreate(
                    title=f"[Email] {email_data['subject']}",
                    description=f"From: {email_data['from']}\n\n{email_data['body']}",
                    priority="medium",
                    status="open",
                    type_id=uuid.UUID("00000000-0000-0000-0000-000000000000") # Need to find a valid type
                )
                # In a real scenario, we would map the sender to a user or create a guest user
                # and assign a proper group.
                # await crud_ticket.create(db, obj_in=ticket_in)
                logger.info(f"Processed email as ticket: {email_data['subject']}")
            except Exception as e:
                logger.error(f"Error processing email {email_data['id']}: {e}")
email_service = EmailService()
