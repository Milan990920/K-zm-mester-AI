import io

from pypdf import PdfWriter
from reportlab.pdfgen import canvas

from app.classification.document_analysis import extract_text_layer


def _digital_pdf_bytes() -> bytes:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer)
    pdf.drawString(100, 750, "E.ON Energiakereskedelmi Kft. — Villamos energia számla")
    pdf.drawString(100, 730, "Számlaszám: 2026/000123, Nettó összeg: 10000 Ft")
    pdf.save()
    return buffer.getvalue()


def _blank_scanned_like_pdf_bytes() -> bytes:
    writer = PdfWriter()
    writer.add_blank_page(width=595, height=842)
    buffer = io.BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


def test_digital_pdf_with_text_layer_is_detected_as_digital():
    result = extract_text_layer(_digital_pdf_bytes())

    assert result.is_digital is True
    assert result.page_count == 1
    assert "E.ON" in result.extracted_text


def test_blank_page_pdf_is_detected_as_scanned():
    result = extract_text_layer(_blank_scanned_like_pdf_bytes())

    assert result.is_digital is False
    assert result.page_count == 1
