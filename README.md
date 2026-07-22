# Közmű Mester

Professzionális, kereskedelmi célú SaaS rendszer magyarországi közüzemi számlák
automatikus, AI-alapú feldolgozására.

Ez **nem** egy demó projekt — a cél egy vállalatoknak értékesíthető, előfizetéses
termék, amely stabilabb, gyorsabb és pontosabb, mint a Govern e-Közüzem rendszer.

## Tervezési dokumentáció

A fejlesztés a `docs/` mappában található terveken alapul:

1. [Rendszerterv](docs/01-rendszerterv.md)
2. [Adatbázis terv](docs/02-adatbazis-terv.md)
3. [Architektúra terv](docs/03-architektura-terv.md)
4. [Repository struktúra](docs/04-repo-struktura.md)

## Technológiai stack

- **Backend:** Python, FastAPI, SQLAlchemy, PostgreSQL, Alembic, Celery
- **Frontend:** React, Next.js, Tailwind CSS
- **Tárolás:** Google Cloud Storage
- **Auth:** JWT + Role Based Access Control
- **AI/OCR:** Anthropic Claude (strukturálás), Google Cloud Vision / Tesseract (OCR)
- **Infra:** Docker, GitHub Actions CI/CD, Pytest

## Repository felépítés

Lásd: [docs/04-repo-struktura.md](docs/04-repo-struktura.md)

## Fejlesztői munkamódszer

A projekt iteratív fázisokban épül: rendszerterv → adatbázis terv → architektúra terv →
repo struktúra → első verzió, majd modulonkénti bővítés. Minden modul külön commitolható
egység, saját automatikus tesztekkel.

## Helyi fejlesztői környezet indítása

```bash
docker compose up -d
```

Lásd a `backend/README.md` és `frontend/README.md` fájlokat a részletekért (a következő
iterációkban készülnek, ahogy az adott modul elkészül).
