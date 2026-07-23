import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict

from app.models.enums import (
    DeliveryFormat,
    InvoiceType,
    ProcessingStatus,
    UtilityType,
    ValidationStatus,
)


class InvoiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    provider_id: uuid.UUID | None
    consumption_point_id: uuid.UUID | None
    utility_type: UtilityType
    invoice_type: InvoiceType
    delivery_format: DeliveryFormat
    invoice_number: str | None
    invoice_date: date | None
    due_date: date | None
    billing_period_start: date | None
    billing_period_end: date | None
    pod: str | None
    net_amount: float | None
    vat_amount: float | None
    gross_amount: float | None
    amount_due: float | None
    currency: str
    validation_status: ValidationStatus
    processing_status: ProcessingStatus
