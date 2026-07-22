"""Deterministic validation rules (docs/03-architektura-terv.md §3.8).

Each rule inspects an `ExtractedInvoiceData` and yields zero or more
`ValidationFinding`s. Rules never mutate the data — they only report.
"""

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

from app.ai.schemas import ExtractedInvoiceData
from app.models.enums import InvoiceType, IssueSeverity

# Rounding tolerance for HUF-style amounts split across net/VAT/gross.
AMOUNT_TOLERANCE = Decimal("0.02")


@dataclass
class ValidationFinding:
    rule_code: str
    severity: IssueSeverity
    message: str
    field_name: str | None = None


def _to_decimal(value: float | None) -> Decimal | None:
    if value is None:
        return None
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def rule_net_vat_gross_consistency(data: ExtractedInvoiceData) -> list[ValidationFinding]:
    net, vat, gross = _to_decimal(data.net_amount), _to_decimal(data.vat_amount), _to_decimal(data.gross_amount)
    if net is None or vat is None or gross is None:
        return []

    if abs((net + vat) - gross) > AMOUNT_TOLERANCE:
        return [
            ValidationFinding(
                rule_code="NET_VAT_GROSS_MISMATCH",
                severity=IssueSeverity.ERROR,
                message=(
                    f"A nettó ({net}) + ÁFA ({vat}) összege nem egyezik a bruttó "
                    f"összeggel ({gross})"
                ),
                field_name="gross_amount",
            )
        ]
    return []


def rule_meter_reading_consistency(data: ExtractedInvoiceData) -> list[ValidationFinding]:
    start, end, consumption = (
        _to_decimal(data.meter_reading_start),
        _to_decimal(data.meter_reading_end),
        _to_decimal(data.consumption_value),
    )
    if start is None or end is None or consumption is None:
        return []

    if abs((end - start) - consumption) > AMOUNT_TOLERANCE:
        return [
            ValidationFinding(
                rule_code="METER_READING_INCONSISTENT",
                severity=IssueSeverity.ERROR,
                message=(
                    f"A záró ({end}) és induló ({start}) mérőállás különbsége nem egyezik "
                    f"a megadott fogyasztással ({consumption})"
                ),
                field_name="consumption_value",
            )
        ]
    return []


def rule_date_ordering(data: ExtractedInvoiceData) -> list[ValidationFinding]:
    findings = []
    if data.invoice_date and data.due_date and data.invoice_date > data.due_date:
        findings.append(
            ValidationFinding(
                rule_code="INVOICE_DATE_AFTER_DUE_DATE",
                severity=IssueSeverity.ERROR,
                message="A számla kelte a fizetési határidő után van",
                field_name="due_date",
            )
        )
    if (
        data.billing_period_start
        and data.billing_period_end
        and data.billing_period_start > data.billing_period_end
    ):
        findings.append(
            ValidationFinding(
                rule_code="BILLING_PERIOD_INVERTED",
                severity=IssueSeverity.ERROR,
                message="Az elszámolási időszak kezdete a vége után van",
                field_name="billing_period_end",
            )
        )
    return findings


def rule_required_fields_by_invoice_type(data: ExtractedInvoiceData) -> list[ValidationFinding]:
    findings = []
    if data.invoice_type == InvoiceType.NETWORK_USAGE_FEE and not data.pod:
        findings.append(
            ValidationFinding(
                rule_code="MISSING_POD_FOR_RHD",
                severity=IssueSeverity.ERROR,
                message="Rendszerhasználati díj (RHD) számlánál a POD megadása kötelező",
                field_name="pod",
            )
        )
    if not data.invoice_number:
        findings.append(
            ValidationFinding(
                rule_code="MISSING_INVOICE_NUMBER",
                severity=IssueSeverity.ERROR,
                message="A számlaszám hiányzik",
                field_name="invoice_number",
            )
        )
    return findings


def rule_non_negative_amounts(data: ExtractedInvoiceData) -> list[ValidationFinding]:
    findings = []
    for field_name, value in [
        ("net_amount", data.net_amount),
        ("gross_amount", data.gross_amount),
        ("consumption_value", data.consumption_value),
    ]:
        if value is not None and value < 0:
            findings.append(
                ValidationFinding(
                    rule_code="NEGATIVE_AMOUNT",
                    severity=IssueSeverity.ERROR,
                    message=f"A(z) '{field_name}' mező értéke nem lehet negatív ({value})",
                    field_name=field_name,
                )
            )
    return findings


def rule_low_confidence_fields(data: ExtractedInvoiceData, threshold: float = 0.6) -> list[ValidationFinding]:
    return [
        ValidationFinding(
            rule_code="LOW_AI_CONFIDENCE",
            severity=IssueSeverity.WARNING,
            message=f"A(z) '{field_name}' mezőt az AI alacsony bizonyossággal ({score:.2f}) adta meg",
            field_name=field_name,
        )
        for field_name, score in data.field_confidence.items()
        if score < threshold
    ]


ALL_RULES = [
    rule_net_vat_gross_consistency,
    rule_meter_reading_consistency,
    rule_date_ordering,
    rule_required_fields_by_invoice_type,
    rule_non_negative_amounts,
    rule_low_confidence_fields,
]
