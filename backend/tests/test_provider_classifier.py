from sqlalchemy import select

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


def test_seeded_providers_are_recognized_from_real_invoice_text(db_session):
    """Regression test for a real bug: the 3 providers created by the manual
    real-invoice import script (see docs/02) had no `detection_patterns`, so
    classify_provider_by_text never matched them even though they existed in
    the DB. app/db/seed.py::seed_providers() must keep these populated."""
    providers = list(db_session.scalars(select(Provider)))
    assert len(providers) >= 5

    samples = {
        "Tiszamenti Regionális Vízművek Zrt.": "Tiszamenti Regionális Vízművek Zrt. 5000 Szolnok",
        "Szombathelyi Távhőszolgáltató Kft.": "Szombathelyi Távhőszolgáltató Kft. 9700 Szombathely",
        "MVM Next Energiakereskedelmi Zrt.": "MVM Next Energiakereskedelmi Zrt. Adószám: 26713111-2-44",
        "EMoGÁ Észak-Magyarországi Gáz Kereskedelmi Kft.": "EMoGÁ Észak-Magyarországi Gáz Kereskedelmi Kft.",
        "E.ON Észak-Dunántúli Áramhálózati Zrt.": "E.ON Észak-Dunántúli Áramhálózati Zártkörűen Működő Részvénytársaság",
    }
    for expected_name, text in samples.items():
        match = classify_provider_by_text(text, providers)
        assert match is not None, f"no match for {expected_name}"
        assert match.provider.name == expected_name
