def test_login_with_correct_credentials_returns_tokens(client, make_tenant, make_user):
    tenant = make_tenant()
    make_user(tenant.id, "customer_admin", email="admin@teszt.hu", password="Titok1234!")

    response = client.post(
        "/api/v1/auth/login", json={"email": "admin@teszt.hu", "password": "Titok1234!"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["refresh_token"]


def test_login_with_wrong_password_is_rejected(client, make_tenant, make_user):
    tenant = make_tenant()
    make_user(tenant.id, "customer_admin", email="admin2@teszt.hu", password="Titok1234!")

    response = client.post(
        "/api/v1/auth/login", json={"email": "admin2@teszt.hu", "password": "rossz-jelszo"}
    )

    assert response.status_code == 401


def test_login_with_unknown_email_is_rejected(client):
    response = client.post(
        "/api/v1/auth/login", json={"email": "nincs-ilyen@teszt.hu", "password": "barmi"}
    )

    assert response.status_code == 401


def test_me_endpoint_requires_valid_token(client, make_tenant, make_user):
    tenant = make_tenant()
    make_user(tenant.id, "customer_user", email="user@teszt.hu", password="Titok1234!")

    login_response = client.post(
        "/api/v1/auth/login", json={"email": "user@teszt.hu", "password": "Titok1234!"}
    )
    access_token = login_response.json()["access_token"]

    me_response = client.get(
        "/api/v1/users/me", headers={"Authorization": f"Bearer {access_token}"}
    )

    assert me_response.status_code == 200
    body = me_response.json()
    assert body["role"] == "customer_user"
    assert body["tenant_id"] == str(tenant.id)


def test_me_endpoint_rejects_missing_token(client):
    response = client.get("/api/v1/users/me")
    assert response.status_code == 401
