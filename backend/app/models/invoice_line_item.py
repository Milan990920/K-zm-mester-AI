import uuid

from sqlalchemy import ForeignKey, Index, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class InvoiceLineItem(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "invoice_line_items"
    __table_args__ = (Index("ix_invoice_line_items_tenant_invoice", "tenant_id", "invoice_id"),)

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False
    )
    line_number: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    quantity: Mapped[float | None] = mapped_column(Numeric(14, 4), nullable=True)
    unit: Mapped[str | None] = mapped_column(String(16), nullable=True)
    unit_net_price: Mapped[float | None] = mapped_column(Numeric(14, 4), nullable=True)
    net_value: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    vat_rate: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    vat_value: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    gross_value: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
