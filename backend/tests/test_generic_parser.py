from app.parsers.generic import GenericInvoiceParser


def test_splits_document_into_labelled_sections():
    text = (
        "Szolgáltató fejléce és ügyfél adatok.\n"
        "FOGYASZTÁSI ADATOK\n"
        "1234 kWh\n"
        "MÉRŐÁLLÁS\n"
        "induló: 1000, záró: 2234\n"
        "FIZETÉSI HATÁRIDŐ\n"
        "2026-08-15"
    )

    parsed = GenericInvoiceParser().parse(text)
    labels = [segment.label for segment in parsed.segments]

    assert labels == ["header", "consumption", "meter_reading", "payment"]
    assert "1234 kWh" in parsed.segment_text("consumption")


def test_falls_back_to_single_body_segment_when_no_headers_found():
    parsed = GenericInvoiceParser().parse("Csak egy sima szöveg, semmilyen ismert szekció fejléc nélkül.")

    assert len(parsed.segments) == 1
    assert parsed.segments[0].label == "body"
