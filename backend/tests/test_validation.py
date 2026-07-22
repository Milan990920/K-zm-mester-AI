from datetime import date

from app.ai.schemas import ExtractedInvoiceData
from app.models.enums import DeliveryFormat, InvoiceType, IssueSeverity, UtilityType
from app.validation.engine import resulting_status, validate


def _base_invoice(**overrides) -> ExtractedInvoiceData:
    defaults = dict(
        utility_type=UtilityType.ELECTRICITY,
        invoice_type=InvoiceType.COMMERCIAL,
        delivery_format=DeliveryFormat.ELECTRONIC,
        invoice_number="2026/000123",
        invoice_date=date(2026, 1, 10),
        due_date=date(2026, 1, 25),
        net_amount=1000.0,
        vat_amount=270.0,
        gross_amount=1270.0,
    )
    defaults.update(overrides)
    return ExtractedInvoiceData(**defaults)


def test_valid_invoice_has_no_error_findings():
    findings = validate(_base_invoice())
    assert resulting_status(findings).value == "valid"


def test_net_vat_gross_mismatch_is_detected():
    findings = validate(_base_invoice(gross_amount=9999.0))

    codes = [f.rule_code for f in findings]
    assert "NET_VAT_GROSS_MISMATCH" in codes
    assert resulting_status(findings).value == "invalid"


def test_meter_reading_inconsistency_is_detected():
    findings = validate(
        _base_invoice(meter_reading_start=1000.0, meter_reading_end=1500.0, consumption_value=999.0)
    )

    assert any(f.rule_code == "METER_READING_INCONSISTENT" for f in findings)


def test_meter_reading_consistent_produces_no_finding():
    findings = validate(
        _base_invoice(meter_reading_start=1000.0, meter_reading_end=1500.0, consumption_value=500.0)
    )

    assert not any(f.rule_code == "METER_READING_INCONSISTENT" for f in findings)


def test_invoice_date_after_due_date_is_detected():
    findings = validate(_base_invoice(invoice_date=date(2026, 2, 1), due_date=date(2026, 1, 1)))
    assert any(f.rule_code == "INVOICE_DATE_AFTER_DUE_DATE" for f in findings)


def test_missing_pod_on_network_usage_fee_invoice_is_an_error():
    findings = validate(_base_invoice(invoice_type=InvoiceType.NETWORK_USAGE_FEE, pod=None))
    assert any(f.rule_code == "MISSING_POD_FOR_RHD" for f in findings)


def test_missing_invoice_number_is_an_error():
    findings = validate(_base_invoice(invoice_number=None))
    assert any(f.rule_code == "MISSING_INVOICE_NUMBER" for f in findings)


def test_negative_amount_is_an_error():
    findings = validate(_base_invoice(net_amount=-100.0, gross_amount=-100.0 + 270.0))
    assert any(f.rule_code == "NEGATIVE_AMOUNT" and f.field_name == "net_amount" for f in findings)


def test_low_confidence_field_is_a_warning_not_an_error():
    findings = validate(_base_invoice(field_confidence={"invoice_number": 0.3}))

    low_confidence = [f for f in findings if f.rule_code == "LOW_AI_CONFIDENCE"]
    assert len(low_confidence) == 1
    assert low_confidence[0].severity == IssueSeverity.WARNING
    # A warning alone must not flip the overall status to invalid.
    assert resulting_status(findings).value == "valid"
