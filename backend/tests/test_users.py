def _login(client, email, password):
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return response.json()["access_token"]


def test_customer_admin_can_list_and_invite_users(client, make_tenant, make_user):
    tenant = make_tenant(name="Users Kft.")
    make_user(tenant.id, "customer_admin", email="owner@teszt.hu", password="Titok1234!")
    token = _login(client, "owner@teszt.hu", "Titok1234!")

    create_response = client.post(
        "/api/v1/users",
        json={
            "email": "colleague@teszt.hu",
            "full_name": "Kolléga Éva",
            "password": "Titok1234!",
            "role": "customer_user",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["role"] == "customer_user"
    assert created["is_active"] is True

    list_response = client.get("/api/v1/users", headers={"Authorization": f"Bearer {token}"})
    assert list_response.status_code == 200
    emails = {user["email"] for user in list_response.json()}
    assert emails == {"owner@teszt.hu", "colleague@teszt.hu"}


def test_customer_user_cannot_invite_users(client, make_tenant, make_user):
    tenant = make_tenant(name="NoAccess Kft.")
    make_user(tenant.id, "customer_user", email="plain@teszt.hu", password="Titok1234!")
    token = _login(client, "plain@teszt.hu", "Titok1234!")

    response = client.post(
        "/api/v1/users",
        json={
            "email": "x@teszt.hu",
            "full_name": "X",
            "password": "Titok1234!",
            "role": "customer_user",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


def test_cannot_create_user_with_privileged_role(client, make_tenant, make_user):
    tenant = make_tenant(name="Privileged Kft.")
    make_user(tenant.id, "customer_admin", email="owner2@teszt.hu", password="Titok1234!")
    token = _login(client, "owner2@teszt.hu", "Titok1234!")

    response = client.post(
        "/api/v1/users",
        json={
            "email": "sneaky@teszt.hu",
            "full_name": "Sneaky",
            "password": "Titok1234!",
            "role": "super_admin",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


def test_customer_admin_can_deactivate_another_user(client, make_tenant, make_user):
    tenant = make_tenant(name="Deactivate Kft.")
    make_user(tenant.id, "customer_admin", email="owner3@teszt.hu", password="Titok1234!")
    colleague = make_user(tenant.id, "customer_user", email="bye@teszt.hu", password="Titok1234!")
    token = _login(client, "owner3@teszt.hu", "Titok1234!")

    response = client.patch(
        f"/api/v1/users/{colleague.id}",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["is_active"] is False


def test_customer_admin_cannot_deactivate_self(client, make_tenant, make_user):
    tenant = make_tenant(name="SelfDeactivate Kft.")
    owner = make_user(tenant.id, "customer_admin", email="owner4@teszt.hu", password="Titok1234!")
    token = _login(client, "owner4@teszt.hu", "Titok1234!")

    response = client.patch(
        f"/api/v1/users/{owner.id}",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400


def test_users_are_tenant_isolated(client, make_tenant, make_user):
    tenant_a = make_tenant(name="Isolated A Kft.")
    tenant_b = make_tenant(name="Isolated B Kft.")
    make_user(tenant_a.id, "customer_admin", email="isoa@teszt.hu", password="Titok1234!")
    make_user(tenant_b.id, "customer_admin", email="isob@teszt.hu", password="Titok1234!")

    token_a = _login(client, "isoa@teszt.hu", "Titok1234!")
    response = client.get("/api/v1/users", headers={"Authorization": f"Bearer {token_a}"})

    emails = {user["email"] for user in response.json()}
    assert emails == {"isoa@teszt.hu"}
