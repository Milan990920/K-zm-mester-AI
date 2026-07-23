"""Seeds static reference data (roles, known providers) that every
environment needs.

Not a migration — these are application-level constants, not schema.
Run with: `python -m app.db.seed`
"""

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.enums import RoleCode, UtilityType
from app.models.provider import Provider
from app.models.role import Role

ROLE_DESCRIPTIONS: dict[RoleCode, str] = {
    RoleCode.SUPER_ADMIN: "Közmű Mester üzemeltető — teljes hozzáférés minden tenanthoz",
    RoleCode.ADMIN: "Közmű Mester belső munkatárs — support és tenant kezelés",
    RoleCode.PARTNER: "Viszonteladó/tanácsadó — több ügyfél tenant felügyelete (olvasás/riport)",
    RoleCode.CUSTOMER_ADMIN: "Ügyfél cég adminja — teljes jog a saját tenanton belül",
    RoleCode.CUSTOMER_USER: "Ügyfél cég munkatársa — korlátozott jogosultság",
}

# Verified against real invoices processed during development — name, tax
# number, and alias/website patterns are taken directly from the source
# PDFs, not guessed. `detection_patterns` drives the deterministic provider
# classification stage (app/classification/provider_classifier.py); a
# provider row without it can never be auto-recognized, only ever matched
# by an AI-structuring fallback.
KNOWN_PROVIDERS: list[dict] = [
    {
        "name": "Tiszamenti Regionális Vízművek Zrt.",
        "tax_number": "11265832-2-16",
        "utility_types": [UtilityType.WATER, UtilityType.SEWAGE],
        "parser_key": "generic",
        "detection_patterns": {
            "aliases": ["Tiszamenti Regionális Vízművek", "TRV Zrt", "trvzrt.hu"],
            "tax_numbers": ["11265832-2-16"],
        },
    },
    {
        "name": "Szombathelyi Távhőszolgáltató Kft.",
        "tax_number": "11301587-2-18",
        "utility_types": [UtilityType.DISTRICT_HEATING],
        "parser_key": "generic",
        "detection_patterns": {
            "aliases": ["Szombathelyi Távhőszolgáltató", "szomtav.hu"],
            "tax_numbers": ["11301587-2-18"],
        },
    },
    {
        "name": "MVM Next Energiakereskedelmi Zrt.",
        "tax_number": "26713111-2-44",
        "utility_types": [UtilityType.ELECTRICITY, UtilityType.GAS],
        "parser_key": "generic",
        "detection_patterns": {
            "aliases": ["MVM Next Energiakereskedelmi", "mvmnext.hu"],
            "tax_numbers": ["26713111-2-44"],
        },
    },
    {
        "name": "EMoGÁ Észak-Magyarországi Gáz Kereskedelmi Kft.",
        "tax_number": "14607569-2-05",
        "utility_types": [UtilityType.GAS],
        "parser_key": "generic",
        "detection_patterns": {
            "aliases": ["EMoGÁ Észak-Magyarországi Gáz Kereskedelmi", "EMoGÁ", "emoga.hu"],
            "tax_numbers": ["14607569-2-05"],
        },
    },
    {
        "name": "E.ON Észak-Dunántúli Áramhálózati Zrt.",
        "tax_number": "10741980-2-08",
        "utility_types": [UtilityType.ELECTRICITY],
        "parser_key": "generic",
        "detection_patterns": {
            "aliases": ["E.ON Észak-Dunántúli Áramhálózati", "eon.hu"],
            "tax_numbers": ["10741980-2-08"],
        },
    },
    {
        "name": "E2 Hungary Zrt.",
        "tax_number": "25343502-2-44",
        "utility_types": [UtilityType.GAS],
        "parser_key": "generic",
        "detection_patterns": {
            "aliases": ["E2 Hungary", "e2hungary.hu"],
            "tax_numbers": ["25343502-2-44"],
        },
    },
]


def seed_roles() -> None:
    with SessionLocal() as db:
        existing_codes = set(db.scalars(select(Role.code)).all())
        for role_code, description in ROLE_DESCRIPTIONS.items():
            if role_code.value in existing_codes:
                continue
            db.add(Role(code=role_code.value, description=description))
        db.commit()


def seed_providers() -> None:
    with SessionLocal() as db:
        existing_names = set(db.scalars(select(Provider.name)).all())
        for spec in KNOWN_PROVIDERS:
            provider = db.scalar(select(Provider).where(Provider.name == spec["name"]))
            if provider is None:
                db.add(Provider(**spec))
                continue
            if spec["name"] in existing_names:
                # Already present — refresh detection_patterns in case this
                # provider was created before it existed (e.g. by an earlier
                # manual import script), but don't touch anything else.
                provider.detection_patterns = spec["detection_patterns"]
        db.commit()


if __name__ == "__main__":
    seed_roles()
    seed_providers()
    print("Roles and providers seeded.")
