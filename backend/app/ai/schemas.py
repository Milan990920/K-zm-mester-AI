"""The forced output schema for the AI structuring step
(docs/03-architektura-terv.md §3.7). The AI model must always answer in this
shape (via tool-use / structured output) — free-text answers are never
accepted, which is one of the pillars of the pipeline's determinism.
"""

from datetime import date

from pydantic import BaseModel, Field

from app.models.enums import DeliveryFormat, InvoiceType, UtilityType


class ExtractedLineItem(BaseModel):
    line_number: int
    description: str
    quantity: float | None = None
    unit: str | None = None
    unit_net_price: float | None = None
    net_value: float | None = None
    vat_rate: float | None = None
    vat_value: float | None = None
    gross_value: float | None = None


class ExtractedMeterReading(BaseModel):
    reading_type: str  # "start" | "end"
    reading_date: date | None = None
    value: float


class ExtractedInvoiceSite(BaseModel):
    """One consumption site on a consolidated ("gyűjtő") invoice that bills
    several locations at once — see docs/02-adatbazis-terv.md follow-up on
    the multi-site invoice limitation."""

    site_address: str
    site_identifier: str | None = None
    meter_serial_number: str | None = None
    consumption_value: float | None = None
    consumption_unit: str | None = None
    gross_amount: float | None = None


class ExtractedInvoiceData(BaseModel):
    utility_type: UtilityType
    # Utilities billed on the same invoice in addition to `utility_type`
    # (e.g. a water bill that also carries the sewage fee).
    secondary_utility_types: list[UtilityType] = Field(default_factory=list)
    invoice_type: InvoiceType
    delivery_format: DeliveryFormat

    invoice_number: str | None = None
    invoice_date: date | None = None
    performance_date: date | None = None
    due_date: date | None = None
    billing_period_start: date | None = None
    billing_period_end: date | None = None

    pod: str | None = None
    poc: str | None = None
    metering_point: str | None = None
    heating_center_id: str | None = None
    meter_serial_number: str | None = None
    contract_number: str | None = None
    current_account_number: str | None = None
    partner_code: str | None = None
    customer_reference: str | None = None

    net_amount: float | None = None
    vat_amount: float | None = None
    gross_amount: float | None = None
    amount_due: float | None = None
    currency: str = "HUF"

    meter_reading_start: float | None = None
    meter_reading_end: float | None = None
    consumption_value: float | None = None
    consumption_unit: str | None = None
    reactive_energy_value: float | None = None
    contracted_capacity_kw: float | None = None
    measured_max_capacity_kw: float | None = None

    line_items: list[ExtractedLineItem] = Field(default_factory=list)
    meter_readings: list[ExtractedMeterReading] = Field(default_factory=list)
    sites: list[ExtractedInvoiceSite] = Field(default_factory=list)

    # Per-field self-assessed confidence in [0, 1], keyed by field name.
    # Missing fields are treated as full confidence (nothing to doubt).
    field_confidence: dict[str, float] = Field(default_factory=dict)

    def confidence_for(self, field_name: str) -> float:
        return self.field_confidence.get(field_name, 1.0)
