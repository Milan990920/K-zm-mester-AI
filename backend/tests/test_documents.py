import io

from reportlab.pdfgen import canvas

from app.ai.schemas import ExtractedInvoiceData
from app.models.document import Document
from app.models.enums import DeliveryFormat, InvoiceType, UtilityType
from app.models.invoice import Invoice
from app.models.processing_run import ProcessingRun
from app.pipeline.dependencies import get_pipeline_orchestrator
from app.storage.factory import get_storage_backend
from app.storage.local import LocalFilesystemStorage


def _digital_pdf_bytes() -> bytes:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer)
    pdf.drawString(100, 750, "E.ON Energiakereskedelmi Kft. — Villamos energia számla")
    pdf.drawString(100, 730, "Ez egy teszt célra generált PDF, valódi szöveg-réteggel.")
    pdf.save()
    return buffer.getvalue()


def _valid_invoice() -> ExtractedInvoiceData:
    return ExtractedInvoiceData(
        utility_type=UtilityType.ELECTRICITY,
        invoice_type=InvoiceType.COMMERCIAL,
        delivery_format=DeliveryFormat.ELECTRONIC,
        invoice_number="2026/000123",
        net_amount=1000.0,
        vat_amount=270.0,
        gross_amount=1270.0,
        line_items=[
            {
                "line_number": 1,
                "description": "Villamos energia fogyasztás",
                "quantity": 100,
                "unit": "kWh",
                "net_value": 1000.0,
            }
        ],
    )


class _FakeAiClient:
    def __init__(self, response: ExtractedInvoiceData):
        self._response = response
        self.call_count = 0

    def structure_invoice(self, segmented_text, provider_hint, invoice_type_hints):
        self.call_count += 1
        return self._response


class _FakeOcrEngine:
    def extract_text(self, pdf_bytes: bytes):
        raise AssertionError("OCR should not be invoked for a digital PDF")


def _override_pipeline_and_storage(app, tmp_path, ai_client):
    from app.pipeline.orchestrator import PipelineOrchestrator

    def _fake_orchestrator():
        return PipelineOrchestrator(
            ocr_engine=_FakeOcrEngine(), ai_client=ai_client, known_providers=[]
        )

    app.dependency_overrides[get_pipeline_orchestrator] = _fake_orchestrator
    app.dependency_overrides[get_storage_backend] = lambda: LocalFilesystemStorage(str(tmp_path))


def _login(client, email, password):
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return response.json()["access_token"]


def test_upload_document_persists_invoice_and_line_items(
    client, make_tenant, make_user, tmp_path, db_session
):
    tenant = make_tenant()
    make_user(tenant.id, "customer_admin", email="upload1@teszt.hu", password="Titok1234!")
    token = _login(client, "upload1@teszt.hu", "Titok1234!")

    ai_client = _FakeAiClient(_valid_invoice())
    _override_pipeline_and_storage(client.app, tmp_path, ai_client)

    response = client.post(
        "/api/v1/documents",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("szamla.pdf", _digital_pdf_bytes(), "application/pdf")},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "done"
    assert body["is_digital"] is True

    invoice = db_session.query(Invoice).filter(Invoice.tenant_id == tenant.id).one()
    assert invoice.invoice_number == "2026/000123"
    assert len(invoice.raw_ai_json["line_items"]) == 1

    processing_runs = db_session.query(ProcessingRun).filter(
        ProcessingRun.tenant_id == tenant.id
    ).all()
    assert len(processing_runs) > 0
    assert all(run.invoice_id == invoice.id for run in processing_runs)

    client.app.dependency_overrides.clear()


def test_uploading_same_content_twice_is_idempotent(
    client, make_tenant, make_user, tmp_path, db_session
):
    tenant = make_tenant()
    make_user(tenant.id, "customer_admin", email="upload2@teszt.hu", password="Titok1234!")
    token = _login(client, "upload2@teszt.hu", "Titok1234!")

    ai_client = _FakeAiClient(_valid_invoice())
    _override_pipeline_and_storage(client.app, tmp_path, ai_client)

    pdf_bytes = _digital_pdf_bytes()
    headers = {"Authorization": f"Bearer {token}"}

    first = client.post(
        "/api/v1/documents", headers=headers, files={"file": ("a.pdf", pdf_bytes, "application/pdf")}
    )
    second = client.post(
        "/api/v1/documents", headers=headers, files={"file": ("b.pdf", pdf_bytes, "application/pdf")}
    )

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] == second.json()["id"]
    assert ai_client.call_count == 1

    document_count = (
        db_session.query(Document).filter(Document.tenant_id == tenant.id).count()
    )
    assert document_count == 1

    client.app.dependency_overrides.clear()


def test_upload_rejects_non_pdf_content_type(client, make_tenant, make_user, tmp_path):
    tenant = make_tenant()
    make_user(tenant.id, "customer_admin", email="upload3@teszt.hu", password="Titok1234!")
    token = _login(client, "upload3@teszt.hu", "Titok1234!")

    _override_pipeline_and_storage(client.app, tmp_path, _FakeAiClient(_valid_invoice()))

    response = client.post(
        "/api/v1/documents",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("not-a-pdf.txt", b"hello", "text/plain")},
    )

    assert response.status_code == 415

    client.app.dependency_overrides.clear()


def test_upload_rejects_corrupt_pdf_with_clean_error(client, make_tenant, make_user, tmp_path):
    tenant = make_tenant()
    make_user(tenant.id, "customer_admin", email="upload4@teszt.hu", password="Titok1234!")
    token = _login(client, "upload4@teszt.hu", "Titok1234!")

    _override_pipeline_and_storage(client.app, tmp_path, _FakeAiClient(_valid_invoice()))

    response = client.post(
        "/api/v1/documents",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("corrupt.pdf", b"not actually a pdf", "application/pdf")},
    )

    assert response.status_code == 422
    assert "PDF" in response.json()["detail"]

    client.app.dependency_overrides.clear()


def test_list_invoices_only_returns_own_tenant(client, make_tenant, make_user, tmp_path):
    tenant_a = make_tenant(name="Lista A Kft.")
    tenant_b = make_tenant(name="Lista B Kft.")
    make_user(tenant_a.id, "customer_admin", email="lista-a@teszt.hu", password="Titok1234!")
    make_user(tenant_b.id, "customer_admin", email="lista-b@teszt.hu", password="Titok1234!")

    token_a = _login(client, "lista-a@teszt.hu", "Titok1234!")
    token_b = _login(client, "lista-b@teszt.hu", "Titok1234!")

    _override_pipeline_and_storage(client.app, tmp_path, _FakeAiClient(_valid_invoice()))
    client.post(
        "/api/v1/documents",
        headers={"Authorization": f"Bearer {token_a}"},
        files={"file": ("a.pdf", _digital_pdf_bytes(), "application/pdf")},
    )

    response_a = client.get("/api/v1/invoices", headers={"Authorization": f"Bearer {token_a}"})
    response_b = client.get("/api/v1/invoices", headers={"Authorization": f"Bearer {token_b}"})

    assert len(response_a.json()) == 1
    assert len(response_b.json()) == 0

    client.app.dependency_overrides.clear()
