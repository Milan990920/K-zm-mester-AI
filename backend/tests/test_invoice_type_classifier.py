from app.classification.invoice_type_classifier import suggest_invoice_types
from app.models.enums import InvoiceType


def test_detects_network_usage_fee_keyword():
    assert InvoiceType.NETWORK_USAGE_FEE in suggest_invoice_types(
        "RENDSZERHASZNÁLATI DÍJ SZÁMLA — MVM Next Zrt."
    )


def test_detects_storno_keyword():
    assert InvoiceType.STORNO in suggest_invoice_types("Ez a számla egy SZTORNÓ számla.")


def test_returns_empty_list_when_no_keyword_matches():
    assert suggest_invoice_types("Teljesen általános szöveg, semmi különös.") == []


def test_correction_takes_priority_over_settlement_when_both_present():
    hints = suggest_invoice_types("HELYESBÍTŐ SZÁMLA az elszámoló számlához kapcsolódóan.")
    assert hints[0] == InvoiceType.CORRECTION
