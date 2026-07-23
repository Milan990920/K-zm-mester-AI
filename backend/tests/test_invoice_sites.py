import hashlib
from datetime import date

from app.models.document import Document
from app.models.enums import DeliveryFormat, DocumentStatus, InvoiceType, UtilityType
from app.models.invoice import Invoice
from app.models.invoice_site import InvoiceSite


def _make_consolidated_invoice(db_session, tenant, user) -> Invoice:
    content = f"{tenant.id}-consolidated".encode()
    document = Document(
        tenant_id=tenant.id,
        uploaded_by_user_id=user.id,
        original_filename="gyujtoszamla.pdf",
        gcs_path="tenants/x/documents/y.pdf",
        content_hash=hashlib.sha256(content).hexdigest(),
        file_size_bytes=10,
        status=DocumentStatus.DONE,
    )
    db_session.add(document)
    db_session.flush()

    invoice = Invoice(
        tenant_id=tenant.id,
        document_id=document.id,
        utility_type=UtilityType.WATER,
        secondary_utility_types=[UtilityType.SEWAGE],
        invoice_type=InvoiceType.COMMERCIAL,
        delivery_format=DeliveryFormat.ELECTRONIC,
        invoice_number="MULTI-001",
        invoice_date=date(2026, 1, 15),
        gross_amount=1000.0,
        currency="HUF",
    )
    db_session.add(invoice)
    db_session.flush()

    for i in range(2):
        db_session.add(
            InvoiceSite(
                tenant_id=tenant.id,
                invoice_id=invoice.id,
                site_address=f"Teszt utca {i + 1}.",
                site_identifier=f"SITE-{i + 1}",
                consumption_value=100.0 + i,
                consumption_unit="kWh",
                gross_amount=500.0,
            )
        )
    db_session.commit()
    return invoice


def _login(client, email, password):
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return response.json()["access_token"]


def test_invoice_list_exposes_secondary_utility_types(client, make_tenant, make_user, db_session):
    tenant = make_tenant(name="Multi Kft.")
    user = make_user(tenant.id, "customer_admin", email="multi@teszt.hu", password="Titok1234!")
    _make_consolidated_invoice(db_session, tenant, user)
    token = _login(client, "multi@teszt.hu", "Titok1234!")

    response = client.get("/api/v1/invoices", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    body = response.json()
    assert body[0]["utility_type"] == "water"
    assert body[0]["secondary_utility_types"] == ["sewage"]


def test_invoice_sites_endpoint_returns_all_sites(client, make_tenant, make_user, db_session):
    tenant = make_tenant(name="Sites Kft.")
    user = make_user(tenant.id, "customer_admin", email="sites@teszt.hu", password="Titok1234!")
    invoice = _make_consolidated_invoice(db_session, tenant, user)
    token = _login(client, "sites@teszt.hu", "Titok1234!")

    response = client.get(
        f"/api/v1/invoices/{invoice.id}/sites", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    sites = response.json()
    assert len(sites) == 2
    assert {site["site_identifier"] for site in sites} == {"SITE-1", "SITE-2"}


def test_invoice_sites_endpoint_blocks_other_tenant(client, make_tenant, make_user, db_session):
    tenant_a = make_tenant(name="Sites A Kft.")
    tenant_b = make_tenant(name="Sites B Kft.")
    user_a = make_user(tenant_a.id, "customer_admin", email="sites-a@teszt.hu", password="Titok1234!")
    make_user(tenant_b.id, "customer_admin", email="sites-b@teszt.hu", password="Titok1234!")
    invoice = _make_consolidated_invoice(db_session, tenant_a, user_a)

    token_b = _login(client, "sites-b@teszt.hu", "Titok1234!")
    response = client.get(
        f"/api/v1/invoices/{invoice.id}/sites", headers={"Authorization": f"Bearer {token_b}"}
    )

    assert response.status_code == 404
