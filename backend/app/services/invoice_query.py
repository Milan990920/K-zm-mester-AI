"""Shared invoice filtering — used by both the list endpoint and the
export endpoint so their filter semantics never drift apart.
"""

import uuid
from datetime import date

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.models.enums import InvoiceType, UtilityType
from app.models.invoice import Invoice


def build_invoice_query(
    tenant_id: uuid.UUID,
    provider_id: uuid.UUID | None = None,
    utility_type: UtilityType | None = None,
    invoice_type: InvoiceType | None = None,
    pod: str | None = None,
    invoice_number: str | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> Select:
    # RLS (see docs/02-adatbazis-terv.md §5) is the second line of defense —
    # the explicit tenant_id filter here is the primary one.
    query = select(Invoice).where(Invoice.tenant_id == tenant_id, Invoice.deleted_at.is_(None))

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

    return query.order_by(Invoice.invoice_date.desc().nulls_last())


def fetch_invoices(db: Session, **filters) -> list[Invoice]:
    query = build_invoice_query(**filters)
    return list(db.scalars(query).all())
