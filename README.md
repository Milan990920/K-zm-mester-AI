# Közmű Mester

Professzionális, kereskedelmi célú SaaS rendszer magyarországi közüzemi számlák
automatikus, AI-alapú feldolgozására.

Ez **nem** egy demó projekt — a cél egy vállalatoknak értékesíthető, előfizetéses
termék, amely stabilabb, gyorsabb és pontosabb, mint a Govern e-Közüzem rendszer.

## Aktuális, aktívan fejlesztett alkalmazás

A `backend/` és `frontend/` mappák a korábbi (jelenleg szüneteltetett) FastAPI-alapú
architektúrát tartalmazzák. Az aktuálisan fejlesztett, önálló Next.js alkalmazás a
repó gyökerében található (`app/`, `components/`, `lib/`, `prisma/`) — ennek
specifikációja a [SPEC.md](SPEC.md) fájlban van.

### Élő próba (Vercel)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FMilan990920%2FK-zm-mester-AI%2Ftree%2Fclaude%2Fkozm%C5%B1-mester-saas-0jgum4&env=DATABASE_URL&envDescription=PostgreSQL%20kapcsolati%20string%20%28pl.%20Neon%20vagy%20Vercel%20Postgres%29&project-name=kozmu-mester-szamlamenedzsment&build-command=npx%20prisma%20migrate%20deploy%20%26%26%20npm%20run%20db%3Aseed%20%26%26%20next%20build)

A gombra kattintva a Vercel importálja a `claude/kozmű-mester-saas-0jgum4` branch-et,
és bekéri a `DATABASE_URL`-t (a Vercel felület Storage/Marketplace füléről egy Neon
Postgres pár kattintással hozzáadható). A build parancs automatikusan lefuttatja a
Prisma migrációkat és feltölti az energianem alapadatokat.

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
