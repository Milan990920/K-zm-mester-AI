import io

from reportlab.pdfgen import canvas

from app.ai.schemas import ExtractedInvoiceData
from app.models.enums import DeliveryFormat, InvoiceType, ProcessingStatus, UtilityType
from app.pipeline.orchestrator import PipelineOrchestrator


def _digital_pdf_bytes(text: str) -> bytes:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer)
    pdf.drawString(100, 750, text)
    pdf.drawString(100, 730, "Ez egy teszt célra generált, valódi szöveg-réteggel rendelkező PDF dokumentum.")
    pdf.save()
    return buffer.getvalue()


def _invalid_invoice() -> ExtractedInvoiceData:
    # Missing invoice_number triggers MISSING_INVOICE_NUMBER (an error).
    return ExtractedInvoiceData(
        utility_type=UtilityType.ELECTRICITY,
        invoice_type=InvoiceType.COMMERCIAL,
        delivery_format=DeliveryFormat.ELECTRONIC,
        invoice_number=None,
    )


def _valid_invoice() -> ExtractedInvoiceData:
    return ExtractedInvoiceData(
        utility_type=UtilityType.ELECTRICITY,
        invoice_type=InvoiceType.COMMERCIAL,
        delivery_format=DeliveryFormat.ELECTRONIC,
        invoice_number="2026/000123",
    )


class _ScriptedAiClient:
    """Fake AI structuring client for testing our own retry logic — not a
    stand-in for the model's understanding, only for the external boundary.
    """

    def __init__(self, responses: list[ExtractedInvoiceData]):
        self._responses = list(responses)
        self.call_count = 0

    def structure_invoice(self, segmented_text, provider_hint, invoice_type_hints):
        response = self._responses[self.call_count]
        self.call_count += 1
        return response


class _UnusedOcrEngine:
    def extract_text(self, pdf_bytes: bytes):
        raise AssertionError("OCR should not be invoked for a digital PDF")


def test_pipeline_succeeds_on_first_attempt_when_data_is_valid():
    ai_client = _ScriptedAiClient([_valid_invoice()])
    orchestrator = PipelineOrchestrator(
        ocr_engine=_UnusedOcrEngine(), ai_client=ai_client, known_providers=[]
    )

    result = orchestrator.process(_digital_pdf_bytes("Villamos energia számla"))

    assert result.processing_status == ProcessingStatus.DONE
    assert result.attempts_used == 1
    assert ai_client.call_count == 1


def test_pipeline_retries_after_validation_failure_then_succeeds():
    ai_client = _ScriptedAiClient([_invalid_invoice(), _valid_invoice()])
    orchestrator = PipelineOrchestrator(
        ocr_engine=_UnusedOcrEngine(), ai_client=ai_client, known_providers=[], max_attempts=3
    )

    result = orchestrator.process(_digital_pdf_bytes("Gáz számla"))

    assert result.processing_status == ProcessingStatus.DONE
    assert result.attempts_used == 2
    assert ai_client.call_count == 2


def test_pipeline_marks_needs_review_after_exhausting_max_attempts():
    ai_client = _ScriptedAiClient([_invalid_invoice(), _invalid_invoice(), _invalid_invoice()])
    orchestrator = PipelineOrchestrator(
        ocr_engine=_UnusedOcrEngine(), ai_client=ai_client, known_providers=[], max_attempts=3
    )

    result = orchestrator.process(_digital_pdf_bytes("Víz számla"))

    assert result.processing_status == ProcessingStatus.NEEDS_REVIEW
    assert result.attempts_used == 3
    assert ai_client.call_count == 3
    assert any(f.rule_code == "MISSING_INVOICE_NUMBER" for f in result.validation_findings)
