import uuid
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user, get_tenant_db
from app.models.enums import InvoiceType, UtilityType
from app.models.invoice import Invoice
from app.models.invoice_site import InvoiceSite
from app.models.invoice_line_item import InvoiceLineItem
from app.reports.invoice_export import invoices_to_csv, invoices_to_xlsx
from app.schemas.invoice import InvoiceDetailRead, InvoiceRead, InvoiceSiteRead
from app.services.invoice_query import fetch_invoices

router = APIRouter(prefix="/invoices", tags=["invoices"])

_EXPORT_CONTENT_TYPES = {
    "csv": "text/csv",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


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
    invoices = fetch_invoices(
        db=db,
        tenant_id=current_user.tenant_id,
        provider_id=provider_id,
        utility_type=utility_type,
        invoice_type=invoice_type,
        pod=pod,
        invoice_number=invoice_number,
        period_start=period_start,
        period_end=period_end,
    )
    return [InvoiceRead.model_validate(invoice) for invoice in invoices]


@router.get("/{invoice_id}/sites", response_model=list[InvoiceSiteRead])
def list_invoice_sites(
    invoice_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
) -> list[InvoiceSiteRead]:
    invoice = db.scalar(select(Invoice).where(Invoice.id == invoice_id))
    if invoice is None:
        raise HTTPException(status_code=404, detail="A számla nem található")

    sites = db.scalars(
        select(InvoiceSite).where(InvoiceSite.invoice_id == invoice_id).order_by(InvoiceSite.site_address)
    ).all()
    return [InvoiceSiteRead.model_validate(site) for site in sites]


@router.get("/export")
def export_invoices(
    format: Literal["csv", "xlsx"] = "xlsx",
    provider_id: uuid.UUID | None = None,
    utility_type: UtilityType | None = None,
    invoice_type: InvoiceType | None = None,
    pod: str | None = None,
    invoice_number: str | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
) -> Response:
    invoices = fetch_invoices(
        db=db,
        tenant_id=current_user.tenant_id,
        provider_id=provider_id,
        utility_type=utility_type,
        invoice_type=invoice_type,
        pod=pod,
        invoice_number=invoice_number,
        period_start=period_start,
        period_end=period_end,
    )

    content = invoices_to_csv(invoices) if format == "csv" else invoices_to_xlsx(invoices)

    return Response(
        content=content,
        media_type=_EXPORT_CONTENT_TYPES[format],
        headers={"Content-Disposition": f'attachment; filename="szamlak.{format}"'},
    )


# Registered last: "/{invoice_id}" is a catch-all single-segment pattern, so
# any more specific single-segment route (like "/export" above) must be
# registered before it — FastAPI/Starlette try routes in registration order
# and a path-parameter type-conversion failure does not fall through to the
# next route.
@router.get("/{invoice_id}", response_model=InvoiceDetailRead)
def get_invoice_detail(
    invoice_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
) -> InvoiceDetailRead:
    invoice = db.scalar(select(Invoice).where(Invoice.id == invoice_id))
    if invoice is None:
        raise HTTPException(status_code=404, detail="A számla nem található")

    line_items = db.scalars(
        select(InvoiceLineItem)
        .where(InvoiceLineItem.invoice_id == invoice_id)
        .order_by(InvoiceLineItem.line_number)
    ).all()

    return InvoiceDetailRead.model_validate(
        {
            **InvoiceRead.model_validate(invoice).model_dump(),
            "document_id": invoice.document_id,
            "line_items": line_items,
        }
    )
