from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, require_permission
from app.crud import crud_ticket
from app.db.models import User
from app.services.export_service import export_service
from app.services.group_service import group_service

router = APIRouter()

@router.get("/tickets/{format}")
async def export_tickets(
    format: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("reports:export:tickets"))],
):
    """
    Export tickets to CSV, Excel or PDF.
    """
    if current_user.is_superuser:
        tickets = await crud_ticket.ticket.get_multi(db, limit=1000)
    else:
        group_ids = await group_service.get_all_child_group_ids(db, current_user.group_id)
        tickets = await crud_ticket.ticket.get_multi_by_group_ids(db, group_ids=group_ids, limit=1000)

    # Convert to dict for export
    data = []
    for t in tickets:
        data.append({
            "ID": str(t.id),
            "Title": t.title,
            "Status": t.status,
            "Priority": t.priority,
            "Created At": t.created_at.strftime("%Y-%m-%d %H:%M") if t.created_at else "",
            "SLA Deadline": t.sla_deadline.strftime("%Y-%m-%d %H:%M") if t.sla_deadline else "N/A"
        })

    if format == "csv":
        content = export_service.to_csv(data)
        media_type = "text/csv"
        filename = "tickets_export.csv"
    elif format == "excel":
        content = export_service.to_excel(data)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = "tickets_export.xlsx"
    elif format == "pdf":
        content = export_service.to_pdf(data, title="SOC Ticket Report")
        media_type = "application/pdf"
        filename = "tickets_report.pdf"
    else:
        raise HTTPException(status_code=400, detail="Invalid format")

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )