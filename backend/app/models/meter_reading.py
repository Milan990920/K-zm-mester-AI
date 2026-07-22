import uuid
from datetime import date

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UUIDPrimaryKeyMixin
from app.models.enums import ReadingMethod, ReadingType


class MeterReading(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "meter_readings"

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )
    meter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("meters.id"), nullable=False
    )
    invoice_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=True
    )
    reading_date: Mapped[date] = mapped_column(Date, nullable=False)
    reading_type: Mapped[ReadingType] = mapped_column(Enum(ReadingType, name="reading_type"), nullable=False)
    value: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    reading_method: Mapped[ReadingMethod | None] = mapped_column(
        Enum(ReadingMethod, name="reading_method"), nullable=True
    )
    created_at: Mapped[date] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
