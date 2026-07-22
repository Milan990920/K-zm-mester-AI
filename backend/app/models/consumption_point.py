import uuid

from sqlalchemy import Enum, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import UtilityType


class ConsumptionPoint(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "consumption_points"
    __table_args__ = (
        Index("ix_consumption_points_tenant_pod", "tenant_id", "pod"),
        Index("ix_consumption_points_tenant_utility", "tenant_id", "utility_type"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    utility_type: Mapped[UtilityType] = mapped_column(
        Enum(UtilityType, name="utility_type"), nullable=False
    )
    pod: Mapped[str | None] = mapped_column(String(64), nullable=True)
    poc: Mapped[str | None] = mapped_column(String(64), nullable=True)
    heating_center_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
