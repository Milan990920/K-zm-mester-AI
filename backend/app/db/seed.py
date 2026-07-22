"""Seeds static reference data (roles) that every environment needs.

Not a migration — role rows are application-level constants, not schema.
Run with: `python -m app.db.seed`
"""

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.enums import RoleCode
from app.models.role import Role

ROLE_DESCRIPTIONS: dict[RoleCode, str] = {
    RoleCode.SUPER_ADMIN: "Közmű Mester üzemeltető — teljes hozzáférés minden tenanthoz",
    RoleCode.ADMIN: "Közmű Mester belső munkatárs — support és tenant kezelés",
    RoleCode.PARTNER: "Viszonteladó/tanácsadó — több ügyfél tenant felügyelete (olvasás/riport)",
    RoleCode.CUSTOMER_ADMIN: "Ügyfél cég adminja — teljes jog a saját tenanton belül",
    RoleCode.CUSTOMER_USER: "Ügyfél cég munkatársa — korlátozott jogosultság",
}


def seed_roles() -> None:
    with SessionLocal() as db:
        existing_codes = set(db.scalars(select(Role.code)).all())
        for role_code, description in ROLE_DESCRIPTIONS.items():
            if role_code.value in existing_codes:
                continue
            db.add(Role(code=role_code.value, description=description))
        db.commit()


if __name__ == "__main__":
    seed_roles()
    print("Roles seeded.")
