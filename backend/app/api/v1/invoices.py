import uuid
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user, get_tenant_db
from app.models.enums import InvoiceType, UtilityType
from app.models.invoice import Invoice
from app.schemas.invoice import InvoiceRead

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get("", response_model=list[InvoiceRead])
def list_invoices(
    provider_id: uuid.UUID | None = None,
    utility_type: UtilityType | None = None,
    invoice_type: InvoiceType | None = None,
    pod: str | None = None,
    invoice_number: str | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
) -> list[InvoiceRead]:
    # RLS (see docs/02-adatbazis-terv.md §5) is the second line of defense —
    # the explicit tenant_id filter here is the primary one.
    query = select(Invoice).where(
        Invoice.tenant_id == current_user.tenant_id, Invoice.deleted_at.is_(None)
    )

    if provider_id is not None:
        query = query.where(Invoice.provider_id == provider_id)
    if utility_type is not None:
        query = query.where(Invoice.utility_type == utility_type)
    if invoice_type is not None:
        query = query.where(Invoice.invoice_type == invoice_type)
    if pod is not None:
        query = query.where(Invoice.pod == pod)
    if invoice_number is not None:
        query = query.where(Invoice.invoice_number == invoice_number)
    if period_start is not None:
        query = query.where(Invoice.billing_period_end >= period_start)
    if period_end is not None:
        query = query.where(Invoice.billing_period_start <= period_end)

    query = query.order_by(Invoice.invoice_date.desc().nulls_last())

    invoices = db.scalars(query).all()
    return [InvoiceRead.model_validate(invoice) for invoice in invoices]
