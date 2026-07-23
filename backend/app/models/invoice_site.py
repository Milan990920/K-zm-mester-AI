import uuid

from sqlalchemy import ForeignKey, Index, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class InvoiceSite(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """One row per consumption site on a consolidated ("gyűjtő") invoice —
    e.g. a single electricity bill covering 30 separate telephely addresses.
    `Invoice.consumption_point_id` stays the single-site case; this table
    covers the multi-site case without forcing a single FK per invoice.
    """

    __tablename__ = "invoice_sites"
    __table_args__ = (Index("ix_invoice_sites_tenant_invoice", "tenant_id", "invoice_id"),)

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False
    )
    consumption_point_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("consumption_points.id"), nullable=True
    )
    site_address: Mapped[str] = mapped_column(String(500), nullable=False)
    site_identifier: Mapped[str | None] = mapped_column(String(64), nullable=True)
    meter_serial_number: Mapped[str | None] = mapped_column(String(128), nullable=True)
    consumption_value: Mapped[float | None] = mapped_column(Numeric(14, 4), nullable=True)
    consumption_unit: Mapped[str | None] = mapped_column(String(16), nullable=True)
    gross_amount: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
