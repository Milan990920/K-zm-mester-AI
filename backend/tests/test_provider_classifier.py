from app.classification.provider_classifier import classify_provider_by_text
from app.models.enums import UtilityType
from app.models.provider import Provider


def _provider(name: str, aliases: list[str], tax_numbers: list[str] | None = None) -> Provider:
    return Provider(
        name=name,
        utility_types=[UtilityType.ELECTRICITY],
        parser_key="generic_invoice_parser_v1",
        detection_patterns={"aliases": aliases, "tax_numbers": tax_numbers or []},
    )


def test_matches_provider_by_alias_in_text():
    eon = _provider("E.ON Energiakereskedelmi Kft.", aliases=["E.ON Energiakereskedelmi", "E.ON"])
    nkm = _provider("NKM Energia Zrt.", aliases=["NKM Energia", "NKM"])

    match = classify_provider_by_text(
        "Ez itt az E.ON Energiakereskedelmi Kft. számlája, tisztelt ügyfelünk.",
        [eon, nkm],
    )

    assert match is not None
    assert match.provider.name == "E.ON Energiakereskedelmi Kft."


def test_returns_none_when_no_provider_matches():
    eon = _provider("E.ON Energiakereskedelmi Kft.", aliases=["E.ON"])

    match = classify_provider_by_text("Teljesen ismeretlen szolgáltató számlája.", [eon])

    assert match is None


def test_more_matched_patterns_increase_confidence():
    eon = _provider(
        "E.ON Energiakereskedelmi Kft.",
        aliases=["E.ON Energiakereskedelmi"],
        tax_numbers=["12345678-2-44"],
    )

    single_match = classify_provider_by_text("E.ON Energiakereskedelmi számlája.", [eon])
    double_match = classify_provider_by_text(
        "E.ON Energiakereskedelmi számlája. Adószám: 12345678-2-44", [eon]
    )

    assert single_match is not None and double_match is not None
    assert double_match.confidence > single_match.confidence
