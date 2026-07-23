import hashlib
from datetime import date

from app.models.document import Document
from app.models.enums import DeliveryFormat, DocumentStatus, InvoiceType, UtilityType
from app.models.invoice import Invoice


def _make_invoice(
    db_session,
    tenant,
    user,
    *,
    invoice_date: date,
    gross_amount: float,
    consumption_value: float | None = None,
    utility_type: UtilityType = UtilityType.ELECTRICITY,
    consumption_unit: str | None = "kWh",
) -> Invoice:
    content = f"{tenant.id}-{invoice_date}-{gross_amount}".encode()
    document = Document(
        tenant_id=tenant.id,
        uploaded_by_user_id=user.id,
        original_filename="teszt.pdf",
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
        utility_type=utility_type,
        invoice_type=InvoiceType.COMMERCIAL,
        delivery_format=DeliveryFormat.ELECTRONIC,
        invoice_number=f"SZ-{invoice_date.isoformat()}",
        invoice_date=invoice_date,
        gross_amount=gross_amount,
        currency="HUF",
        consumption_value=consumption_value,
        consumption_unit=consumption_unit,
    )
    db_session.add(invoice)
    db_session.commit()
    return invoice


def _login(client, email, password):
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return response.json()["access_token"]


def test_dashboard_summary_aggregates_by_month(client, make_tenant, make_user, db_session):
    tenant = make_tenant(name="Dashboard Kft.")
    user = make_user(tenant.id, "customer_admin", email="dash1@teszt.hu", password="Titok1234!")
    token = _login(client, "dash1@teszt.hu", "Titok1234!")

    today = date.today()
    same_month_a = today.replace(day=1)
    same_month_b = today.replace(day=min(today.day, 28))

    _make_invoice(
        db_session, tenant, user, invoice_date=same_month_a, gross_amount=1000.0, consumption_value=100.0
    )
    _make_invoice(
        db_session, tenant, user, invoice_date=same_month_b, gross_amount=500.0, consumption_value=50.0
    )

    response = client.get("/api/v1/dashboard/summary", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    body = response.json()
    current_month_key = today.strftime("%Y-%m")

    cost_entry = next(m for m in body["monthly_costs"] if m["month"] == current_month_key)
    assert cost_entry["gross_amount_sum"] == 1500.0

    consumption_entry = next(
        c for c in body["monthly_consumption"] if c["month"] == current_month_key
    )
    assert consumption_entry["consumption_sum"] == 150.0
    assert consumption_entry["utility_type"] == "electricity"

    assert body["yearly_total_cost"] == 1500.0


def test_dashboard_summary_only_includes_own_tenant(client, make_tenant, make_user, db_session):
    tenant_a = make_tenant(name="Dash A Kft.")
    tenant_b = make_tenant(name="Dash B Kft.")
    make_user(tenant_a.id, "customer_admin", email="dash-a@teszt.hu", password="Titok1234!")
    user_b = make_user(tenant_b.id, "customer_admin", email="dash-b@teszt.hu", password="Titok1234!")

    _make_invoice(db_session, tenant_b, user_b, invoice_date=date.today(), gross_amount=99999.0)

    token_a = _login(client, "dash-a@teszt.hu", "Titok1234!")
    response = client.get("/api/v1/dashboard/summary", headers={"Authorization": f"Bearer {token_a}"})

    assert response.status_code == 200
    assert response.json()["yearly_total_cost"] == 0.0


def test_dashboard_summary_excludes_invoices_outside_rolling_window(
    client, make_tenant, make_user, db_session
):
    tenant = make_tenant(name="Old Kft.")
    user = make_user(tenant.id, "customer_admin", email="dash-old@teszt.hu", password="Titok1234!")
    token = _login(client, "dash-old@teszt.hu", "Titok1234!")

    old_date = date(date.today().year - 5, 1, 1)
    _make_invoice(db_session, tenant, user, invoice_date=old_date, gross_amount=250.0)

    response = client.get("/api/v1/dashboard/summary", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    old_month_key = old_date.strftime("%Y-%m")
    assert all(m["month"] != old_month_key for m in response.json()["monthly_costs"])
