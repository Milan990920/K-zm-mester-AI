import uuid

from sqlalchemy import Enum, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import MeterType


class Meter(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "meters"
    __table_args__ = (Index("ix_meters_tenant_serial", "tenant_id", "serial_number"),)

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )
    consumption_point_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("consumption_points.id"), nullable=False
    )
    serial_number: Mapped[str] = mapped_column(String(128), nullable=False)
    meter_type: Mapped[MeterType] = mapped_column(Enum(MeterType, name="meter_type"), nullable=False)
    unit: Mapped[str] = mapped_column(String(16), nullable=False)
