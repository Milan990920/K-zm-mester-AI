from sqlalchemy import ARRAY, Boolean, Enum, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import UtilityType


class Provider(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "providers"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    tax_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    utility_types: Mapped[list[UtilityType]] = mapped_column(
        ARRAY(Enum(UtilityType, name="utility_type")), nullable=False
    )
    parser_key: Mapped[str] = mapped_column(String(64), nullable=False)
    detection_patterns: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
