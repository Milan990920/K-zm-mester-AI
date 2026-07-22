# Közmű Mester — GitHub repository struktúra

**Verzió:** 0.1.0

## 1. Elrendezés — monorepo, moduláris almappákkal

```
K-zm-mester-AI/
├── docs/                       # tervezési dokumentumok (ez a mappa)
│   ├── 01-rendszerterv.md
│   ├── 02-adatbazis-terv.md
│   ├── 03-architektura-terv.md
│   └── 04-repo-struktura.md
│
├── backend/
│   ├── app/
│   │   ├── core/               # config, logging, exceptions
│   │   ├── db/                 # engine, session, base, RLS setup
│   │   ├── models/              # SQLAlchemy ORM modellek
│   │   ├── schemas/             # Pydantic sémák
│   │   ├── auth/                # JWT, RBAC, password hashing
│   │   ├── api/v1/               # FastAPI routerek
│   │   ├── ocr/                 # OCR interfész + implementációk
│   │   ├── classification/      # doc/provider/invoice type klasszifikáció
│   │   ├── parsers/              # szolgáltatónkénti parser registry
│   │   ├── ai/                   # AI strukturáló kliens
│   │   ├── validation/           # szabály-motor
│   │   ├── pipeline/             # orchestrator
│   │   ├── storage/              # GCS kliens
│   │   ├── reports/              # export modul
│   │   ├── assistant/            # NL keresés
│   │   └── main.py               # FastAPI app factory
│   ├── alembic/                  # migrációk
│   ├── tests/                    # pytest, modulonként tükrözve
│   ├── pyproject.toml
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── app/                  # Next.js App Router oldalak
│   │   ├── components/
│   │   ├── lib/                  # API kliens, auth context
│   │   └── styles/
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
│
├── .github/
│   └── workflows/
│       ├── backend-ci.yml
│       └── frontend-ci.yml
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

## 2. Elvek

- **Backend és frontend teljesen független** telepíthetőségű (külön Dockerfile, külön CI).
- A `backend/app` alatti almappák a 03. architektúra tervben definiált modulhatárokat
  követik 1:1-ben — ez szándékos, hogy a kód és a dokumentáció ne váljon szét.
- Minden modulhoz `tests/<modul_neve>/` tükrözött teszt mappa tartozik.
- A `docs/` mappa élő dokumentáció — minden jelentős architekturális döntés itt frissül.
- Verziókövetés: Conventional Commits stílusú commit üzenetek (`feat:`, `fix:`, `docs:`,
  `test:`, `chore:`), hogy a CI/CD és a changelog generálás automatizálható legyen később.

## 3. Következő lépések ebben az iterációban

1. Backend alapvázának létrehozása (`core`, `db`, `models`, `auth`) — valódi, futtatható kód.
2. Alembic inicializálás + első migráció a 02. dokumentum sémája alapján.
3. Docker Compose (Postgres + backend) helyi fejlesztéshez.
4. Alap pytest tesztek.
5. GitHub Actions CI (lint + pytest).
6. Frontend minimális váz (login oldal, dashboard placeholder).

A pipeline modulok (`ocr`, `classification`, `parsers`, `ai`, `validation`, `pipeline`)
interfész-szinten már ebben az iterációban létrejönnek (hogy a modulhatárok korán
rögzüljenek), de a teljes szolgáltató-specifikus lefedettség több iterációt fog igényelni.
