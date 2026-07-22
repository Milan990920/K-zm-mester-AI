# Közmű Mester — Rendszerterv (System Plan)

**Verzió:** 0.1.0 (első iteráció)
**Dátum:** 2026-07-22
**Státusz:** Tervezési fázis — jóváhagyásra vár, de a fejlesztés ez alapján elindul

## 1. Célkitűzés

A Közmű Mester egy kereskedelmi célú, előfizetéses (SaaS) rendszer, amely magyarországi
vállalati ügyfelek közüzemi számláit dolgozza fel automatikusan, magas pontossággal,
és biztosítja ezek strukturált tárolását, keresését, riportozását.

Versenytárs referencia: Govern e-Közüzem. Cél: nagyobb pontosság, gyorsabb feldolgozás,
jobb felhasználói élmény, natív AI asszisztens.

**Nem cél ebben a fázisban:** számlázás/fizetés a Közmű Mester ügyfelei felé (ez külön,
később tervezendő modul — Stripe/Barion integráció), mobil app.

## 2. Érintettek (stakeholders)

| Szerep | Leírás |
|---|---|
| Super Admin | Közmű Mester üzemeltető, minden tenant felett teljes jogosultság |
| Admin | Közmű Mester belső munkatárs, tenantok kezelése, support |
| Partner | Viszonteladó/tanácsadó cég, több ügyfél tenant felügyelete (csak olvasás/riport) |
| Ügyfél (Tenant Admin) | Előfizető cég adminja, saját tenanton belül teljes jog |
| Ügyfél felhasználó | Előfizető cég munkatársa, korlátozott jogokkal (pl. csak megtekintés, csak egy telephely) |

## 3. Támogatott közművek

- Villamos energia
- Földgáz
- Víz
- Csatorna
- Távhő
- Hulladékgazdálkodás

## 4. Támogatott számlatípusok

- Kereskedelmi számla
- Rendszerhasználati díj (RHD)
- Teljesítménydíj
- Részszámla
- Elszámoló számla
- Sztornó
- Helyesbítő
- Elektronikus számla
- Papír alapú szkennelt számla

Ezek a dimenziók egymástól függetlenek: egy számla egyszerre rendelkezik közmű-típussal
(pl. földgáz) és számlatípussal (pl. RHD elszámoló számla). A rendszernek mindkettőt
külön mezőként kell tárolnia és felismernie.

## 5. Kinyerendő adatok (funkcionális minimum)

### 5.1 Fejléc / azonosító adatok
szolgáltató, számlaszám, számla kelte, teljesítés dátuma, fizetési határidő,
elszámolási időszak kezdete/vége, fogyasztási hely, fogyasztási hely azonosító,
POD, POC, mérési pont, hőközpont azonosító, mérő gyári száma, szerződésszám,
folyószámla, partnerkód, ügyfélazonosító.

### 5.2 Pénzügyi adatok
nettó összeg, ÁFA (kulcs + összeg), bruttó összeg, fizetendő összeg, pénznem.

### 5.3 Fogyasztási adatok
- Villany: kWh (hatásos), meddő energia (kvarh)
- Gáz: m³, kWh, MJ (átszámítási tényezővel együtt tárolva)
- Víz: m³
- Távhő: GJ

### 5.4 Mérőállások
induló, záró, (opcionálisan: leolvasás módja — becsült/tényleges)

### 5.5 Teljesítmény
lekötött/szerződött kW, mért maximális teljesítmény (kW), időszak.

### 5.6 Számlatételek (line items)
Minden tétel külön rekordként: tétel neve, mennyiség, mértékegység, nettó egységár,
nettó érték, ÁFA (kulcs/összeg), bruttó érték. Egy számlához N tétel tartozik.

## 6. Pontossági követelmény (kritikus, nem alkuképes)

- Regex-alapú, "néhány mezőt kiszedő" megoldás **nem elfogadható**.
- Minden AI-kimenetet **validálni** kell (séma-validáció, kereszt-ellenőrzés:
  pl. nettó + ÁFA == bruttó, induló + fogyasztás == záró mérőállás, dátum-sorrendek).
- Bizonytalan/hibás AI válasz esetén **automatikus újrafeldolgozás** történik
  (más prompt-stratégiával, magasabb "reasoning effort"-tal, vagy emberi review sorba
  kerül, ha az automatikus javítás sem sikerül).
- **Determinizmus:** ugyanaz a PDF többszöri feldolgozás esetén ugyanazt az eredményt
  kell, hogy adja. Ezt biztosítja: (a) tartalom-hash alapú cache a pipeline lépések
  eredményein, (b) alacsony hőmérsékletű (temperature=0) AI hívások, (c) séma-kényszerített
  (structured output / tool-use) AI válaszok, (d) verzionált parser-szabályok szolgáltatónként.
- Minden feldolgozási lépés eredménye (OCR szöveg, AI nyers JSON, validációs riport)
  megmarad — teljes nyomonkövethetőség (auditability) végett.

## 7. Multi-tenant modell

- Adatbázis szinten **megosztott séma + tenant_id oszlop** (row-level tenant izoláció),
  PostgreSQL Row Level Security (RLS) policy-kkal kikényszerítve — védelem az alkalmazói
  hiba ellen is, nem csak a WHERE szűrésre hagyatkozva.
- Minden tábla, ami ügyféladatot tartalmaz, tartalmaz `tenant_id` FK-t.
- Fájltárolás (GCS) bucket-en belül tenant-prefixű elérési úttal (`gs://bucket/tenants/{tenant_id}/...`),
  és a hozzáférés a signed URL-eken keresztül, JWT-ben szereplő tenant_id ellenőrzésével.

## 8. Fő funkciók (MVP scope, iteratív bővítéssel)

1. PDF feltöltés (drag & drop, tömeges feltöltés — több fájl egyszerre)
2. Feldolgozási pipeline indítása, státusz követése (queued/processing/done/failed/needs_review)
3. Eredeti PDF + OCR szöveg + AI nyers JSON tárolása és visszakereshetősége
4. Strukturált adatok listázása, szűrése (ügyfél, szolgáltató, közmű, POD, fogyasztási hely,
   mérő, időszak, számlaszám, számlatípus)
5. Export: Excel, CSV, PDF (riport formátumban)
6. Dashboard: havi/éves fogyasztás és költség, grafikonok, trendek
7. AI asszisztens: természetes nyelvű keresés/analitika a tenant adatain (RAG + tool-use
   a strukturált DB felett, nem szabad hallucinált számokat adnia — kizárólag DB lekérdezés
   eredményét fogalmazza meg szövegesen)

## 9. Nem-funkcionális követelmények

- **Biztonság:** JWT + refresh token, RBAC, tenant izoláció minden rétegben (API, DB, storage),
  jelszó hashelés (bcrypt/argon2), audit log minden adatmódosító műveletről.
- **Megbízhatóság:** feldolgozási hiba esetén a számla `needs_review` állapotba kerül,
  nem vész el, és admin felületen manuálisan javítható/jóváhagyható.
- **Skálázhatóság:** feldolgozás aszinkron háttér workerben (nem blokkolja az API-t),
  horizontálisan skálázható worker réteg.
- **Megfigyelhetőség:** strukturált logging, feldolgozási metrikák (sikeres/hibás arány,
  átlagos feldolgozási idő szolgáltatónként).
- **Tesztelhetőség:** minden modulhoz automatikus teszt (pytest), CI-ban futtatva.
- **Karbantarthatóság:** moduláris repo-struktúra, világos interfészek modulhatárokon.

## 10. Iterációs terv (magas szintű roadmap)

| Iteráció | Tartalom |
|---|---|
| 0 | Rendszerterv, adatbázis terv, architektúra terv, repo struktúra (jelen dokumentumok) |
| 1 | Backend alapok: DB modellek, auth (JWT+RBAC), multi-tenant middleware, CI |
| 2 | Dokumentum pipeline váza: upload, tárolás (GCS), digitális/szkennelt detektálás, OCR |
| 3 | Szolgáltató/számlatípus klasszifikáció, első 1-2 szolgáltatóra specifikus parser + AI strukturálás |
| 4 | Validációs réteg, automatikus újrafeldolgozás, needs_review workflow |
| 5 | Frontend: upload, lista, szűrés, dashboard |
| 6 | Export modul (Excel/CSV/PDF), AI asszisztens (NL keresés) |
| 7+ | További szolgáltatók, finomhangolás, terheléses tesztek, subscription/billing modul |

Ez a dokumentum élő dokumentum — minden iteráció végén frissül, ha a scope változik.
