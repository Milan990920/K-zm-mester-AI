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
    secondary_utility_types: list[UtilityType]
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


class InvoiceLineItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    line_number: int
    description: str
    quantity: float | None
    unit: str | None
    unit_net_price: float | None
    net_value: float | None
    vat_rate: float | None
    vat_value: float | None
    gross_value: float | None


class InvoiceDetailRead(InvoiceRead):
    document_id: uuid.UUID
    line_items: list[InvoiceLineItemRead]


class InvoiceSiteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    site_address: str
    site_identifier: str | None
    meter_serial_number: str | None
    consumption_value: float | None
    consumption_unit: str | None
    gross_amount: float | None
