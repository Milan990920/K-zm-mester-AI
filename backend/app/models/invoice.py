import uuid
from datetime import date

from sqlalchemy import CHAR, Date, Enum, ForeignKey, Index, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import (
    DeliveryFormat,
    InvoiceType,
    ProcessingStatus,
    UtilityType,
    ValidationStatus,
)


class Invoice(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "invoices"
    __table_args__ = (
        Index("ix_invoices_tenant_number", "tenant_id", "invoice_number"),
        Index("ix_invoices_tenant_provider", "tenant_id", "provider_id"),
        Index("ix_invoices_tenant_pod", "tenant_id", "pod"),
        Index(
            "ix_invoices_tenant_period", "tenant_id", "billing_period_start", "billing_period_end"
        ),
        Index("ix_invoices_tenant_utility_type", "tenant_id", "utility_type", "invoice_type"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id"), unique=True, nullable=False
    )
    provider_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("providers.id"), nullable=True
    )
    consumption_point_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("consumption_points.id"), nullable=True
    )

    utility_type: Mapped[UtilityType] = mapped_column(Enum(UtilityType, name="utility_type"), nullable=False)
    invoice_type: Mapped[InvoiceType] = mapped_column(Enum(InvoiceType, name="invoice_type"), nullable=False)
    delivery_format: Mapped[DeliveryFormat] = mapped_column(
        Enum(DeliveryFormat, name="delivery_format"), nullable=False
    )

    invoice_number: Mapped[str | None] = mapped_column(String(128), nullable=True)
    invoice_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    performance_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    billing_period_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    billing_period_end: Mapped[date | None] = mapped_column(Date, nullable=True)

    pod: Mapped[str | None] = mapped_column(String(64), nullable=True)
    poc: Mapped[str | None] = mapped_column(String(64), nullable=True)
    metering_point: Mapped[str | None] = mapped_column(String(64), nullable=True)
    heating_center_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    meter_serial_number: Mapped[str | None] = mapped_column(String(128), nullable=True)
    contract_number: Mapped[str | None] = mapped_column(String(128), nullable=True)
    current_account_number: Mapped[str | None] = mapped_column(String(128), nullable=True)
    partner_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    customer_reference: Mapped[str | None] = mapped_column(String(128), nullable=True)

    net_amount: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    vat_amount: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    gross_amount: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    amount_due: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    currency: Mapped[str] = mapped_column(CHAR(3), default="HUF", nullable=False)

    meter_reading_start: Mapped[float | None] = mapped_column(Numeric(14, 4), nullable=True)
    meter_reading_end: Mapped[float | None] = mapped_column(Numeric(14, 4), nullable=True)
    consumption_value: Mapped[float | None] = mapped_column(Numeric(14, 4), nullable=True)
    consumption_unit: Mapped[str | None] = mapped_column(String(16), nullable=True)
    reactive_energy_value: Mapped[float | None] = mapped_column(Numeric(14, 4), nullable=True)
    contracted_capacity_kw: Mapped[float | None] = mapped_column(Numeric(14, 4), nullable=True)
    measured_max_capacity_kw: Mapped[float | None] = mapped_column(Numeric(14, 4), nullable=True)

    ai_confidence_score: Mapped[float | None] = mapped_column(Numeric(5, 4), nullable=True)
    validation_status: Mapped[ValidationStatus] = mapped_column(
        Enum(ValidationStatus, name="validation_status"),
        default=ValidationStatus.PENDING,
        nullable=False,
    )
    processing_status: Mapped[ProcessingStatus] = mapped_column(
        Enum(ProcessingStatus, name="processing_status"),
        default=ProcessingStatus.QUEUED,
        nullable=False,
    )
    raw_ai_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
