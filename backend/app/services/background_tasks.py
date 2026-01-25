import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal
from app.db.models.ticket import Ticket
from app.services.notification_service import notification_service
from app.services.email_service import email_service

logger = logging.getLogger(__name__)

async def poll_incoming_emails():
    """
    Background task to poll incoming emails and create tickets.
    Runs every 2 minutes.
    """
    while True:
        try:
            async with AsyncSessionLocal() as db:
                await email_service.process_emails_as_tickets(db)
            await asyncio.sleep(120)
        except Exception as e:
            logger.error(f"Error in email polling task: {e}")
            await asyncio.sleep(60)

async def check_sla_breaches():
    """
    Background task to check for tickets near SLA breach.
    Runs every 5 minutes.
    """
    while True:
        try:
            async with AsyncSessionLocal() as db:
                # Find open/in_progress tickets breaching in the next 30 minutes
                threshold = datetime.now() + timedelta(minutes=30)
                query = select(Ticket).filter(
                    Ticket.status.in_(['open', 'in_progress']),
                    Ticket.sla_deadline <= threshold,
                    Ticket.sla_deadline > datetime.now()
                )
                result = await db.execute(query)
                tickets = result.scalars().all()

                for ticket in tickets:
                    # Notify assigned user or group
                    user_to_notify = ticket.assigned_to_id or ticket.created_by_id
                    await notification_service.notify_user(
                        db,
                        user_id=user_to_notify,
                        title="⚠️ SLA Warning",
                        message=f"Ticket '{ticket.title}' is breaching in less than 30 minutes!",
                        link=f"/tickets/{ticket.id}"
                    )
                    logger.info(f"SLA Warning sent for ticket {ticket.id}")

            await asyncio.sleep(300) # Check every 5 minutes
        except Exception as e:
            logger.error(f"Error in SLA background task: {e}")
            await asyncio.sleep(60)
