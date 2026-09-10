# Számlamenedzsment platform — fejlesztési specifikáció

## 0. FONTOS — a rendszer a Nyugat-dunántúli Vízügyi Igazgatóságra (NYUDUVIZIG) van szabva

Az eredeti terv alább egy általános, több ügyfeles számlamenedzsment SaaS volt.
A felhasználó a felület kipróbálása közben úgy döntött, hogy a rendszert
**kizárólag a Nyugat-dunántúli Vízügyi Igazgatóság energetikai szakreferensi
jelentéséhez** szabja — a feltöltött valós "Szakreferens alaptáblázat
NYUDUVIZIG 2026.xlsx" táblázat és MVM/E.ON/VASIVÍZ mintaszámlák alapján.

**Ami emiatt megváltozott az alább leírt tervhez képest:**

- **Adatmodell átnevezve/bővítve**: `Site` → `ConsumptionSite` (+ `category`:
  `BUILDING`/`ACTIVITY`/`TRANSPORT` — "Épület"/"Tevékenység"/"Szállítás", az
  excel "összesítő" fülének megfelelően), `MeteringPoint` → `MeasurementPoint`
  (+ `measurementType`: `TIME_SERIES`/`PROFILE` — "idősoros"/"profilos", +
  `status` az `isActive` helyett). `EnergyType.allowedUnits` (string tömb)
  helyett önálló `Unit` tábla (`energyTypeId`, `name`, `kwhPerUnit` — kWh-
  átváltási tényező), és új `CO2Factor` tábla (`energyTypeId`, `year`,
  `kgCo2PerKwh` — évenként verziózva). `Invoice.unit` (szabad szöveg) helyett
  `Invoice.unitId` (FK a `Unit`-ra). `Customer` kibővítve szakreferensi
  mezőkkel (`specialistName`, `specialistQualification`,
  `certificateIssuer`, `certificateNumber`, `serviceCompanyName/Address/
  TaxNumber`, `relationshipStartDate`).
- **Energianem-készlet a valós excel alapján**: villamos energia, földgáz,
  faapríték, üzemanyag (liter benzin / liter gázolaj két külön `Unit`-ként).
  **Víz/csatorna szándékosan nincs seedelve** — a szakreferensi
  energiajelentés (2015. évi LVII. tv.) kWh-ban kifejezhető
  energiahordozókra vonatkozik, a víznek nincs értelmes kg CO2/kWh
  tényezője. Az `EnergyType` tábla admin-szerkeszthető, bővíthető.
- **Dashboard CO2-KPI-val**: összes CO2-kibocsátás (kg) + kategória szerinti
  (Épület/Tevékenység/Szállítás) bontás grafikonon, a `/api/dashboard`
  végpontban a `quantity × Unit.kwhPerUnit × CO2Factor.kgCo2PerKwh`
  számítással (csak akkor pontos, ha a CO2-tényező az adott évre fel van
  véve — ha hiányzik, a KPI jelzi).
- **Seed valós adatokkal**: a "Nyugat-dunántúli Vízügyi Igazgatóság" ügyfél
  (adószám 15308421-2-18) + az excel "Villamos energia"/"Földgáz"
  szakaszaiban felsorolt, valós POD-kódú telephelyek — ld.
  `prisma/seed.ts` fejlécében a részletes forrás- és megbízhatósági jegyzetet
  (a telephelynevek a POD-kódokból kiolvasott közelítések, nem hivatalos
  névjegyzék).
- Az alább következő eredeti terv (1–9. pont) a **még mindig érvényes**
  architektúrát, design-rendszert és validációs szabályokat írja le — csak
  az entitásnevek/mezők és az energianem-készlet változott a fentiek szerint.

---

> **Hogyan használd:** illeszd be ezt a dokumentumot első üzenetként a Claude Code-ba (a GitHub-repóval összekötve), vagy commitold a repó gyökerébe `SPEC.md` néven, és kérd meg: *"Olvasd el a SPEC.md-t, és valósítsd meg lépésről lépésre a 8. pont sorrendjében."* Ez a fájl egy önálló energiaszámla-kezelő webalkalmazás teljes specifikációja — a középpontban a számlamenedzsment (adatmegjelenítés, szűrés, tárolás, dashboard) áll.
>
> A projekt felépülése után érdemes a Claude Code `/init` parancsával egy külön, rövid (200 sor alatti) `CLAUDE.md`-t generáltatni a kialakult build-parancsokból és konvenciókból — ez a dokumentum egy egyszeri, részletes build-specifikáció, nem az a fajta rövid, örökös projekt-memória, amit a `CLAUDE.md`-nek szánnak.

## 1. Mit építünk, és miért így

Egy önálló **energiaszámla-menedzsment webalkalmazást** kell felépíteni, amely a hazai közüzemi/energetikai piacon bevált mintákat követi — ügyfél-alapú számlatárolás, POD-azonosítós fogyasztási helyek, energianem szerinti bontás, fogyasztási dashboardok —, funkcionálisan hasonlót nyújtva, mint amit az E-közüzem és a Panda energiamenedzsment szoftverek biztosítanak a számlakezelés terén. A cél egy **önálló, saját arculatú és saját kódú** rendszer, nem másolat.

Vezérelv minden döntéshez:
**Az egyszerű programozhatóság és a biztos működés előbbre való, mint a funkciók száma.** Inkább kevesebb funkció legyen hibátlan, egyértelmű adatmodellel, mint sok funkció bizonytalan alapokon.

## 2. Háttér — mintát adó rendszerek

- **E-közüzem** (ekozuzem.hu): a szolgáltatóktól függetlenül tölt le vagy fogad be számlákat, PDF-ből strukturált adattá alakítja őket, "ingatlan-fa" struktúrában (fogyasztási helyek szerint) rendszerez, kézi számlarögzítést, mennyiség- és költséggrafikonokat, szerepkör-kezelést és exportot kínál; a hangsúly az adatszolgáltatási határidők betartásán és az átláthatóságon van.
- **Panda energiamenedzsment** (pandaenergia.hu): automatikusan letölti és rendszerezi a számlákat közvetlenül a szolgáltatóktól, negyedórás idősoros adatokkal kiegészítve; a számlamenedzsment modul táblázatos, kereshető nyilvántartást ad a felhasznált mennyiségről és költségről, több telephely összehasonlítását és a kötelező adatszolgáltatás (szakreferens, EMIT) egyszerűsítését szolgálja; kiegészítő modulok: riasztás, szerződéskezelés, manuális rögzítés, üzemanyag-nyilvántartás.

Közös minta, amit ez a specifikáció átvesz: **ügyfél → fogyasztási hely → POD/mérési pont → számla** hierarchia, energianemenkénti egyértelmű elkülönítés, és a mennyiség + mértékegység együttes, hibátlan megjelenítése.

## 3. Adatmodell

### 3.1 Entitások

**Ügyfél**
- azonosító, név, adószám (opcionális), kapcsolattartó neve / email / telefon
- egy ügyfélhez több fogyasztási hely tartozik

**Fogyasztási hely**
- azonosító, ügyfél (kötelező kapcsolat), megnevezés, cím
- egy fogyasztási helyhez több mérési pont (POD) tartozhat

**Mérési pont (POD)**
- azonosító, fogyasztási hely (kötelező kapcsolat)
- POD-kód / mérési pont azonosító (villamos energia: 33 karakter; földgáz: 16 karakter, "39N" prefixszel — ld. 4. pont)
- energianem (kötelező, ld. 3.2)
- szolgáltató neve (kereskedő és hálózati engedélyes külön mezőben is tárolható)
- aktuális mérőóra gyári szám (tájékoztató jelleggel — a ténylegesen számlázott gyári szám mindig a számlán van rögzítve, mert a mérőt idővel lecserélhetik)
- aktív/inaktív státusz

**Számla**
- azonosító, ügyfél (denormalizálva a gyors listázáshoz), fogyasztási hely, mérési pont (POD)
- szolgáltató neve, számlaszám, kiállítás dátuma
- számlázási időszak kezdete és vége (két dátummező, de a felületen mindig együtt jelennek meg)
- fizetési határidő
- energianem (kötelezően meg kell egyeznie a mérési pont energianemével)
- fogyasztott mennyiség (szám) + mértékegység (kötelezően a 3.2 táblázatból)
- mérőóra gyári szám (a számlán ténylegesen szereplő érték)
- nettó összeg, áfakulcs, áfa összeg, bruttó összeg, pénznem (alapértelmezett: HUF)
- egységár (megadható vagy számolható: bruttó / mennyiség)
- számla típusa: elszámoló / részszámla / göngyölített / jóváíró
- fizetési státusz: nyitott / fizetve / késedelmes
- csatolt fájl elérési útja (PDF vagy kép)
- rögzítés módja: kézi rögzítés / feltöltött PDF (jövőbeli bővítés: automatikus szolgáltatói letöltés)
- rögzítő felhasználó, létrehozás és módosítás időbélyege

### 3.2 Energianem és mértékegység-szabály — ez a modell szíve

Az energianemeket **külön adminisztrálható táblában** kell tárolni (nem hardkódolt kódbeli enumként), hogy új energianem kódmódosítás nélkül felvehető legyen. Kezdő készlet és a hozzájuk **kizárólag** választható mértékegységek:

| Energianem | Engedélyezett mértékegységek |
|---|---|
| Villamos energia | kWh, MWh |
| Földgáz | m³, MJ, GJ |
| Távhő | GJ, MWh |
| Víz | m³ |
| Csatorna | m³ |
| Üzemanyag (benzin/gázolaj) | liter, kg |

**Szabály:** a számla mentésekor a mértékegység-mező legördülő lista, amely csak a kiválasztott energianemhez tartozó mértékegységeket kínálja fel — szabad szöveges bevitel nem engedélyezett. Ez zárja ki a leggyakoribb hibát (pl. földgáz kWh helyett m³-ben rögzítve, vagy fordítva).

## 4. Validációs szabályok — kötelezők, ne engedj kivételt

1. Kötelező mezők mentés előtt: ügyfél, fogyasztási hely, POD, szolgáltató, számlázási időszak (kezdet + vég), energianem, mennyiség + mértékegység, bruttó összeg. Hiányos számla csak piszkozatként menthető.
2. Számlázási időszak: a kezdő dátum szigorúan korábbi, mint a záró dátum.
3. Mennyiség/mértékegység pár csak a 3.2 táblázat szerint kombinálható.
4. Duplikátum-figyelmeztetés (jelzés, nem kemény tiltás): ha ugyanahhoz a POD-hoz és szolgáltatóhoz már létezik számla ugyanazzal a számlaszámmal, vagy átfedő számlázási időszakkal.
5. POD-formátum ellenőrzés: villamos energiánál 33, földgáznál 16 karakter — eltérésnél csak figyelmeztetés, mert a valós szolgáltatói minták eltérhetnek; ez nem blokkolhatja a mentést.
6. Feltöltött fájl csak PDF vagy kép (jpg/png), méretkorlát (pl. 15 MB).

## 5. Funkcionális követelmények

### 5.1 Számlabetöltés
- Drag & drop, több fájl egyszerre feltölthető (elsődlegesen PDF).
- Feltöltéskor kötelező kiválasztani (vagy helyben létrehozni) az ügyfelet, a fogyasztási helyet és a POD-ot, majd kitölteni a 3. pont mezőit egy kézi űrlapon.
- Automatikus PDF-adatkinyerés (OCR / AI-alapú mezőfelismerés) **ne legyen az első verzió része** — jelöld explicit jövőbeli bővítésként, hogy ne lassítsa az alapfunkciók stabil elkészülését.
- Mentés után a számla azonnal megjelenik a listában és a dashboardon.

### 5.2 Tárolás és szűrés — az ügyfél az elsődleges szervező elv
- Az alkalmazás nyitóképernyője **ügyfélválasztó**: kereshető lista, és egyszerre mindig egy ügyfél adatai vannak fókuszban (ügyfél-izoláció a nézetben).
- Ügyfélen belül: fogyasztási hely → POD → energianem szerint szűkíthető almenü/szűrő, ebben a sorrendben.
- Számlalista szűrői, egymással kombinálhatók (ÉS-logika):
  - fogyasztási hely (több is választható)
  - POD
  - energianem
  - szolgáltató
  - számlázási időszak: dátumintervallum + gyorsgombok (aktuális hónap, negyedév, év, egyedi intervallum)
  - fizetési státusz
- Szabadszöveges kereső: számlaszám, POD, mérőóra gyári szám alapján.
- A szűrőállapot tükröződjön az URL-ben (megosztható/könyvjelezhető legyen).

### 5.3 Megjelenítési szabályok — szigorúan kötelező, ne térj el tőle
A számlalista táblázat oszlopai, ebben a sorrendben, ezekkel a formázási szabályokkal:

1. Ügyfél neve
2. Fogyasztási hely (név + rövidített cím)
3. **POD / mérési pont azonosító** — monospace betűtípussal, teljes egészében (soha nem csonkolva), egy kattintásra másolható
4. **Mérőóra gyári szám** — monospace, szintén egy kattintásra másolható
5. Szolgáltató neve
6. Energianem — jelvényként (badge), egyedi színkóddal és/vagy ikonnal energianemenként (ld. 7. pont)
7. **Számlázási időszak** — a kezdő és záró dátum EGYÜTT, egyetlen mezőben, formátum: `ÉÉÉÉ.HH.NN. – ÉÉÉÉ.HH.NN.`; soha ne jelenjen meg önmagában csak az egyik dátum
8. **Fogyasztott mennyiség** — a szám és a mértékegység MINDIG egyetlen egységként, egy cellában jelenjen meg (pl. `12 450 kWh`, `348 m³`), ezres tagolással; a mennyiség és a mértékegység soha nem kerülhet külön oszlopba vagy külön komponensbe
9. Nettó/bruttó összeg — pénznem-jelöléssel (Ft/EUR), ezres tagolással
10. Fizetési státusz — jelvény
11. Melléklet — ikon, kattintásra megnyitja/letölti a csatolt PDF-et

Számla-részletnézet (side panel vagy külön oldal): a fenti összes mező, plusz a csatolt PDF beágyazott előnézete a mezők mellett.

Üres állapotok legyenek instruktívak, ne csak "nincs adat" szöveg (pl.: *"Ehhez a fogyasztási helyhez még nincs feltöltött számla — töltsön fel egyet."*).

### 5.4 Dashboard — kiegészítő funkció, de kötelező elem
- Ugyanazok a szűrők, mint az 5.2-ben, kiegészítve energianem szerinti gyors bontással.
- KPI-kártyák: időszaki összes fogyasztás (mennyiség + mértékegység együtt), időszaki összes költség, átlagos egységár, változás az előző, azonos hosszúságú időszakhoz képest (%).
- Grafikonok:
  - fogyasztási trend idővonalon, havi bontásban, a kiválasztott fogyasztási hely(ek) és energianem szerint
  - költségmegoszlás energianemenként
  - fogyasztási helyek összehasonlítása egymással (oszlopdiagram)
  - fogyasztási hőtérkép: hónap × fogyasztási hely mátrix, színintenzitással
- CSV-exportálás a szűrt adathalmazról.

## 6. Technológiai javaslat

- **Next.js (App Router) + TypeScript** — egy repó, egy futtatható app, jó Claude Code-kompatibilitás.
- **Prisma ORM + PostgreSQL** (fejlesztéshez SQLite is elég; Prisma miatt könnyen váltható).
- **Zod** — ugyanaz a séma validáljon szerveren és kliensen is; a 3.2 pont energianem→mértékegység szabálya kódban (nem csak UI-ban) legyen kikényszerítve.
- **Tailwind CSS + shadcn/ui** komponensekhez.
- **Recharts** vagy **Tremor** a diagramokhoz (dashboard).
- Fájltárolás: kezdetben helyi `/uploads` mappa, előkészítve S3-kompatibilis tárolóra való átállásra.
- **Vitest** egységtesztek a kritikus logikára: mértékegység-validáció, KPI-számítások, duplikátum-ellenőrzés — ez adja a "biztos működést".
- Ha egyszerre több felhasználó jelentkezik be: egyszerű, credential-alapú bejelentkezés (pl. NextAuth); egyfelhasználós induló verziónál ezt hagyd ki az MVP-ből.

Javasolt mappastruktúra:

```
/app                  # oldalak és API route-ok
/components           # UI-komponensek
/lib/validations      # zod sémák (energianem–mértékegység szabály itt)
/lib/calculations     # KPI, egységár, összehasonlítás logika
/prisma/schema.prisma # adatmodell
/tests                # Vitest tesztek
```

## 7. Design irányelvek — "designos, különleges témájú" felület

Vizuális koncepció: **"Mérőóra és számlakönyv"** — mérnöki grafikonpapír-háttér és analóg mérőóra-tárcsa motívum, mert a tartalom is ebből áll: mérési pontok, gyári számok, sorba rendezett számlák.

**Paletta**
- Alapháttér: `#F3F5F1` (hűvös, zöldes-szürke "mérnökpapír" tónus)
- Halvány rácsvonalak háttérként (dekoratív, ~5% opacitás): `#B9C2B4`
- Kártya/panel háttér: `#FFFFFF`, vékony `#E4E8E1` kerettel
- Elsődleges szöveg: `#1E2422` · Másodlagos szöveg: `#5C6B63`
- Signature-szín (sárgaréz mérőóra-tárcsa): `#B8863B`
- Figyelmeztetés/hiba: `#C1443B`

**Energianem szerinti jelvényszínek** (csak jelvényeken és grafikonokon, nem az általános felületen)
Villamos energia `#2F6FA3` · Földgáz `#C97A2E` · Távhő `#B8402F` · Víz `#2E8F92` · Csatorna `#5C6B63` · Üzemanyag `#6B4F8A`

**Tipográfia**
- Fejlécek: *Space Grotesk* (karakteres, technikai jellegű)
- Törzsszöveg: *IBM Plex Sans*
- Adatok (POD, gyári szám, összegek, táblázat számoszlopai): *IBM Plex Mono* — a számok és kódok szépen igazodjanak egymás alá, "műszerfal"-érzetet adva.

**Signature elem:** a dashboard KPI-kártyáin egy félkör alakú, skálázott analóg mérőóra-tárcsa jelenjen meg, amelynek mutatója betöltéskor egyszer, animáltan a helyes értékre mozdul — ez konkrétan a tartalomból (villany-, gáz-, vízórák) fakad, nem generikus KPI-kártya. Ugyanez a rácsmotívum nagyon halványan megjelenhet a táblázatok háttereként is.

**Elrendezés:** bal oldali navigáció három szintű fastruktúra (Ügyfél → Fogyasztási hely → Energianem-chipek) — a navigáció tükrözze az adatmodell hierarchiáját. Főfelület: sűrű, jól olvasható "számlakönyv" táblázat. Dashboard nézet: mérőóra-tárcsás KPI-k + grafikonok.

**Mozgás:** visszafogott — csak a tárcsák animálódnak betöltéskor, hovereknél finom kiemelés, semmi felesleges dísz-animáció.

**Szövegezés:** egyszerű, cselekvő igék magyarul (pl. "Számla feltöltése", nem "Feltöltés indítása"); az üres és hibaállapotok legyenek instruktívak, ne csak jelezzenek problémát.

## 8. Build-sorrend (MVP → bővítés)

1. Adatmodell (Prisma séma) + zod validáció (energianem–mértékegység szabály)
2. Ügyfél / fogyasztási hely / POD CRUD felületek
3. Számla CRUD: kézi rögzítés + PDF feltöltés és tárolás
4. Szűrhető, az 5.3 pont szerint formázott számlalista
5. Dashboard: KPI-k + a 4 grafikontípus
6. **PDF-adatkinyerés (a felhasználó kifejezett kérésére, a tervezettnél korábban bevezetve):** feltöltött PDF számlából mintaillesztéssel felismert mezők (ügyfél adószáma és neve alapján automatikus ügyfél-párosítás, szolgáltató, számlaszám, dátumok, POD, mennyiség+mértékegység, összegek) előtöltik a kézi rögzítés űrlapját — ld. 6.1 pont.
7. **Jövőbeli bővítés (nem MVP):** automatikus szolgáltatói számlaletöltés, AI-alapú (nem csak mintaillesztéses) adatkinyerés képfájlokból, szerepkör-/jogosultságkezelés, szerződésmenedzsment modul, riasztások

### 6.1 PDF-adatkinyerés — megvalósítási jegyzet

Az eredeti terv (9. pont) az OCR-t explicit 2. fázisra halasztotta volna, de a
felhasználó valós közműszámla-mintákat adott (E.ON, EMoGÁ, MVM, távhő-
szolgáltató), és kérte, hogy ezek alapján a rendszer ismerje fel az ügyfelet és
a számla adatait feltöltéskor. Ez **nem AI/LLM-alapú OCR**, hanem a
`lib/invoiceExtraction.ts`-ben implementált, a bemutatott formátumokból tanult
mintaillesztés (`pdf-parse` szöveg-kinyerés + reguláris kifejezések):

- Az ügyfél-azonosítás az adószám alapján történik (a dokumentumban talált
  adószámok közül az első a szolgáltatóé, az utolsó az ügyfélé — ez a minta
  mind a négy bemutatott formátumban konzisztens).
- Ahol egy mező bizonytalanul volna felismerhető (pl. egy kapacitásdíj-számlán
  nincs valódi fogyasztási mennyiség), a mező üresen marad, és figyelmeztetés
  jelzi, hogy kézi ellenőrzés/kitöltés szükséges — sosem találgat.
- Ez a megoldás a bemutatott (és hasonló elnevezésű mezőket használó)
  szolgáltatói formátumokra általánosít jól; egy teljesen új elrendezésű
  számlánál előfordulhat, hogy egyes mezőket nem ismer fel — ilyenkor a
  kézi kitöltés marad az egyetlen út, amíg a mintakészlet bővül.

## 9. Amit kifejezetten ne csinálj

- Ne engedd a szabad szöveges mértékegység-bevitelt.
- Ne válaszd szét a mennyiséget és a mértékegységet külön UI-elemre, ahol egy értékként várható.
- Ne építs bele AI/LLM-alapú OCR-t (külső szolgáltatás, API-kulcs) — a PDF-adatkinyerés (6.1 pont) szándékosan önálló, mintaillesztéses és külső függőség nélküli.
- Ne hagyd, hogy a felismerés hibás adatot írjon felül csendben — bizonytalan mezőnél inkább maradjon üresen, kézi kitöltésre várva.
- Ne tegyél a 7. pontban leírt signature-elemen (mérőóra-tárcsa) felül semmilyen felesleges animációt vagy dekorációt.
