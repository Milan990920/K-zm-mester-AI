import hashlib
from datetime import date

from app.models.document import Document
from app.models.enums import DeliveryFormat, DocumentStatus, InvoiceType, UtilityType
from app.models.invoice import Invoice
from app.models.invoice_line_item import InvoiceLineItem
from app.storage.factory import get_storage_backend
from app.storage.local import LocalFilesystemStorage

PDF_BYTES = b"%PDF-1.4 teszt tartalom a letoltes vegpont ellenorzesehez"


def _make_invoice_with_document(db_session, tenant, user, tmp_path) -> Invoice:
    content_hash = hashlib.sha256(PDF_BYTES).hexdigest()
    storage_path = f"tenants/{tenant.id}/documents/{content_hash}.pdf"
    LocalFilesystemStorage(str(tmp_path)).save(storage_path, PDF_BYTES)

    document = Document(
        tenant_id=tenant.id,
        uploaded_by_user_id=user.id,
        original_filename="reszletes.pdf",
        gcs_path=storage_path,
        content_hash=content_hash,
        file_size_bytes=len(PDF_BYTES),
        status=DocumentStatus.DONE,
    )
    db_session.add(document)
    db_session.flush()

    invoice = Invoice(
        tenant_id=tenant.id,
        document_id=document.id,
        utility_type=UtilityType.ELECTRICITY,
        invoice_type=InvoiceType.COMMERCIAL,
        delivery_format=DeliveryFormat.ELECTRONIC,
        invoice_number="DETAIL-001",
        invoice_date=date(2026, 1, 15),
        net_amount=1000.0,
        vat_amount=270.0,
        gross_amount=1270.0,
        currency="HUF",
    )
    db_session.add(invoice)
    db_session.flush()

    db_session.add(
        InvoiceLineItem(
            tenant_id=tenant.id,
            invoice_id=invoice.id,
            line_number=1,
            description="Villamos energia fogyasztás",
            quantity=100,
            unit="kWh",
            net_value=1000.0,
            vat_value=270.0,
            gross_value=1270.0,
        )
    )
    db_session.commit()
    return invoice


def _login(client, email, password):
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return response.json()["access_token"]


def test_invoice_detail_includes_line_items(client, make_tenant, make_user, db_session, tmp_path):
    tenant = make_tenant(name="Detail Kft.")
    user = make_user(tenant.id, "customer_admin", email="detail@teszt.hu", password="Titok1234!")
    invoice = _make_invoice_with_document(db_session, tenant, user, tmp_path)
    token = _login(client, "detail@teszt.hu", "Titok1234!")

    response = client.get(
        f"/api/v1/invoices/{invoice.id}", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["invoice_number"] == "DETAIL-001"
    assert body["document_id"] == str(invoice.document_id)
    assert len(body["line_items"]) == 1
    assert body["line_items"][0]["description"] == "Villamos energia fogyasztás"


def test_invoice_detail_404_for_other_tenant(client, make_tenant, make_user, db_session, tmp_path):
    tenant_a = make_tenant(name="Detail A Kft.")
    tenant_b = make_tenant(name="Detail B Kft.")
    user_a = make_user(tenant_a.id, "customer_admin", email="detail-a@teszt.hu", password="Titok1234!")
    make_user(tenant_b.id, "customer_admin", email="detail-b@teszt.hu", password="Titok1234!")
    invoice = _make_invoice_with_document(db_session, tenant_a, user_a, tmp_path)

    token_b = _login(client, "detail-b@teszt.hu", "Titok1234!")
    response = client.get(
        f"/api/v1/invoices/{invoice.id}", headers={"Authorization": f"Bearer {token_b}"}
    )

    assert response.status_code == 404


def test_export_endpoint_still_works_alongside_detail_route(client, make_tenant, make_user):
    tenant = make_tenant(name="ExportStillWorks Kft.")
    make_user(tenant.id, "customer_admin", email="stillworks@teszt.hu", password="Titok1234!")
    token = _login(client, "stillworks@teszt.hu", "Titok1234!")

    response = client.get(
        "/api/v1/invoices/export?format=csv", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")


def test_download_document_returns_pdf_bytes(client, make_tenant, make_user, db_session, tmp_path):
    tenant = make_tenant(name="Download Kft.")
    user = make_user(tenant.id, "customer_admin", email="download@teszt.hu", password="Titok1234!")
    invoice = _make_invoice_with_document(db_session, tenant, user, tmp_path)
    token = _login(client, "download@teszt.hu", "Titok1234!")

    client.app.dependency_overrides[get_storage_backend] = lambda: LocalFilesystemStorage(str(tmp_path))
    try:
        response = client.get(
            f"/api/v1/documents/{invoice.document_id}/download",
            headers={"Authorization": f"Bearer {token}"},
        )
    finally:
        client.app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content == PDF_BYTES


def test_download_document_404_for_other_tenant(client, make_tenant, make_user, db_session, tmp_path):
    tenant_a = make_tenant(name="Download A Kft.")
    tenant_b = make_tenant(name="Download B Kft.")
    user_a = make_user(tenant_a.id, "customer_admin", email="download-a@teszt.hu", password="Titok1234!")
    make_user(tenant_b.id, "customer_admin", email="download-b@teszt.hu", password="Titok1234!")
    invoice = _make_invoice_with_document(db_session, tenant_a, user_a, tmp_path)

    token_b = _login(client, "download-b@teszt.hu", "Titok1234!")
    client.app.dependency_overrides[get_storage_backend] = lambda: LocalFilesystemStorage(str(tmp_path))
    try:
        response = client.get(
            f"/api/v1/documents/{invoice.document_id}/download",
            headers={"Authorization": f"Bearer {token_b}"},
        )
    finally:
        client.app.dependency_overrides.clear()

    assert response.status_code == 404
