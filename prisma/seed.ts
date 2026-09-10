// A Nyugat-dunántúli Vízügyi Igazgatóság feltöltött "Szakreferens
// alaptáblázat NYUDUVIZIG 2026.xlsx" táblázatának valós szerkezete alapján:
// energianemek + mértékegységek (a táblázatban ténylegesen használtak), az
// ügyfél maga, és a táblázat "Villamos energia"/"Földgáz" szakaszaiban
// felsorolt, konkrét POD-kóddal azonosított telephelyek/mérési pontok.
//
// FONTOS: a telephelyek nevét a POD-kódok rövidített utótagjából
// (pl. "...-BARAND---" -> "Barand") olvastuk ki — ezek NEM garantáltan a
// hivatalos, teljes helységnevek/pontos címek, csak a táblázatból
// kikövetkeztethető, olvasható közelítések. A tényleges NYUDUVIZIG-
// munkatárs a felületen (Fogyasztási hely szerkesztése) pontosíthatja őket.
//
// CO2-tényezőt SZÁNDÉKOSAN nem seedelünk: a hivatalos, évente publikált
// kibocsátási tényezőket a szakreferens ismeri és tölti fel az admin
// felületen (Energiatípusok / CO2-tényezők) — kitalált számot itt nem
// akartunk becsempészni.
import { PrismaClient } from "@prisma/client";
import { INITIAL_ENERGY_TYPES, INITIAL_UNITS } from "../lib/validations/energyType";

const prisma = new PrismaClient();

const CUSTOMER_NAME = "Nyugat-dunántúli Vízügyi Igazgatóság";
const CUSTOMER_TAX_NUMBER = "15308421-2-18";

interface SeedSite {
  name: string;
  category: "BUILDING" | "ACTIVITY" | "TRANSPORT";
  points: { podCode: string; energyTypeCode: string; measurementType: "TIME_SERIES" | "PROFILE" }[];
}

// A táblázat "Villamos energia" és "Földgáz" szakaszaiban felsorolt,
// névvel/POD-kóddal azonosított (tehát idősoros mérésű) telephelyek.
const SEED_SITES: SeedSite[] = [
  {
    name: "Székház — Szombathely, Vörösmarty utca 2.",
    category: "BUILDING",
    points: [
      { podCode: "HU000110F11-U-NY-D-VIZU-IG-SZO-ZA", energyTypeCode: "electricity", measurementType: "TIME_SERIES" },
      { podCode: "HU000110F11-U-NY-DTUL-VIZU-IG-SZO", energyTypeCode: "electricity", measurementType: "TIME_SERIES" },
      { podCode: "39N050146791000A", energyTypeCode: "gas", measurementType: "TIME_SERIES" },
    ],
  },
  {
    name: "Keszthelyi telephely",
    category: "BUILDING",
    points: [{ podCode: "39N040048089000V", energyTypeCode: "gas", measurementType: "TIME_SERIES" }],
  },
  {
    name: "Barandi telephely",
    category: "ACTIVITY",
    points: [{ podCode: "HU000120F11-U-NYDUN-VIZ-BARAND---", energyTypeCode: "electricity", measurementType: "TIME_SERIES" }],
  },
  {
    name: "Buberek-i telephely",
    category: "ACTIVITY",
    points: [{ podCode: "HU000120F11-U-NYDUN-VIZ-BUBEREK--", energyTypeCode: "electricity", measurementType: "TIME_SERIES" }],
  },
  {
    name: "Fonyódi telephely",
    category: "ACTIVITY",
    points: [{ podCode: "HU000120F11-U-NYDUN-VIZ-FONYED---", energyTypeCode: "electricity", measurementType: "TIME_SERIES" }],
  },
  {
    name: "Keszthely Déli telephely",
    category: "ACTIVITY",
    points: [{ podCode: "HU000120F11-U-NYDUN-VIZ-KHELY-DEL", energyTypeCode: "electricity", measurementType: "TIME_SERIES" }],
  },
  {
    name: "Keszthely Északi telephely",
    category: "ACTIVITY",
    points: [{ podCode: "HU000120F11-U-NYDUN-VIZ-KHELY-ESZ", energyTypeCode: "electricity", measurementType: "TIME_SERIES" }],
  },
  {
    name: "Vörsi telephely",
    category: "ACTIVITY",
    points: [{ podCode: "HU000120F11-U-NYDUN-VIZ-VORS-----", energyTypeCode: "electricity", measurementType: "TIME_SERIES" }],
  },
  {
    name: "Fenékpuszta Középső telephely",
    category: "ACTIVITY",
    points: [{ podCode: "HU000120F11-U-NYDVIZ-FENEKP-KOZEP", energyTypeCode: "electricity", measurementType: "TIME_SERIES" }],
  },
  {
    name: "Zalavári szivattyútelep",
    category: "ACTIVITY",
    points: [{ podCode: "HU000120F11-U-SZIVATTYU-ZALAVAR--", energyTypeCode: "electricity", measurementType: "TIME_SERIES" }],
  },
  {
    name: "Szökedencsi szivattyútelep",
    category: "ACTIVITY",
    points: [{ podCode: "HU000120F11-U-SZIVATTYUT-SZOKEDEN", energyTypeCode: "electricity", measurementType: "TIME_SERIES" }],
  },
  // Profilos (kisfogyasztású) telephelyek — a ténylegesen feltöltött MVM
  // mintaszámlákból ismert, valós POD-dal/címmel.
  {
    name: "Garabonc, Fő utca 0/A",
    category: "BUILDING",
    points: [{ podCode: "HU000120-11-S00000000000000626379", energyTypeCode: "electricity", measurementType: "PROFILE" }],
  },
  {
    name: "Körmend, Vágóhíd utca",
    category: "BUILDING",
    points: [{ podCode: "HU000110-11-S00000000000001293944", energyTypeCode: "electricity", measurementType: "PROFILE" }],
  },
];

async function main() {
  const energyTypeIdByCode = new Map<string, string>();
  for (const energyType of INITIAL_ENERGY_TYPES) {
    const row = await prisma.energyType.upsert({
      where: { code: energyType.code },
      update: {},
      create: { code: energyType.code, name: energyType.name, badgeColor: energyType.badgeColor, sortOrder: energyType.sortOrder },
    });
    energyTypeIdByCode.set(energyType.code, row.id);
  }

  for (const [energyTypeCode, units] of Object.entries(INITIAL_UNITS)) {
    const energyTypeId = energyTypeIdByCode.get(energyTypeCode);
    if (!energyTypeId) continue;
    for (const unit of units) {
      await prisma.unit.upsert({
        where: { energyTypeId_name: { energyTypeId, name: unit.name } },
        update: {},
        create: { energyTypeId, name: unit.name, kwhPerUnit: unit.kwhPerUnit },
      });
    }
  }

  const customer =
    (await prisma.customer.findFirst({ where: { taxNumber: CUSTOMER_TAX_NUMBER } })) ??
    (await prisma.customer.create({ data: { name: CUSTOMER_NAME, taxNumber: CUSTOMER_TAX_NUMBER } }));

  for (const site of SEED_SITES) {
    const existingSite = await prisma.consumptionSite.findFirst({ where: { customerId: customer.id, name: site.name } });
    const consumptionSite =
      existingSite ??
      (await prisma.consumptionSite.create({
        data: { customerId: customer.id, name: site.name, category: site.category },
      }));

    for (const point of site.points) {
      const energyTypeId = energyTypeIdByCode.get(point.energyTypeCode);
      if (!energyTypeId) continue;
      const existingPoint = await prisma.measurementPoint.findFirst({ where: { podCode: point.podCode } });
      if (existingPoint) continue;
      await prisma.measurementPoint.create({
        data: {
          consumptionSiteId: consumptionSite.id,
          podCode: point.podCode,
          energyTypeId,
          measurementType: point.measurementType,
        },
      });
    }
  }

  console.log(`Energianemek/mértékegységek seedelve, ügyfél: ${CUSTOMER_NAME}, ${SEED_SITES.length} telephely.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
