from sqlalchemy import select

from app.db.session import tenant_scoped_session
from app.models.consumption_point import ConsumptionPoint
from app.models.enums import UtilityType


def test_tenant_scoped_session_only_sees_own_tenant_rows(db_session, make_tenant):
    tenant_a = make_tenant(name="A Kft.")
    tenant_b = make_tenant(name="B Kft.")

    db_session.add_all(
        [
            ConsumptionPoint(tenant_id=tenant_a.id, name="A telephely", utility_type=UtilityType.ELECTRICITY),
            ConsumptionPoint(tenant_id=tenant_b.id, name="B telephely", utility_type=UtilityType.GAS),
        ]
    )
    db_session.commit()

    with tenant_scoped_session(tenant_a.id) as scoped_db:
        visible = scoped_db.scalars(select(ConsumptionPoint)).all()

    assert [cp.name for cp in visible] == ["A telephely"]


def test_tenant_scoped_session_does_not_leak_across_tenants(db_session, make_tenant):
    tenant_a = make_tenant(name="C Kft.")
    tenant_b = make_tenant(name="D Kft.")

    db_session.add(
        ConsumptionPoint(tenant_id=tenant_b.id, name="D telephely", utility_type=UtilityType.WATER)
    )
    db_session.commit()

    with tenant_scoped_session(tenant_a.id) as scoped_db:
        visible = scoped_db.scalars(select(ConsumptionPoint)).all()

    assert visible == []
