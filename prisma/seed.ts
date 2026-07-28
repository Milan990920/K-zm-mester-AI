// Csak a SPEC.md 3.2 pontja szerinti kezdő energianem-készletet tölti fel —
// az EnergyType tábla ezután admin-szerkeszthető, ez a script csak a
// hiányzó kódokat pótolja, meglévőt nem ír felül.
import { PrismaClient } from "@prisma/client";
import { INITIAL_ENERGY_TYPES } from "../lib/validations/energyType";

const prisma = new PrismaClient();

async function main() {
  for (const energyType of INITIAL_ENERGY_TYPES) {
    await prisma.energyType.upsert({
      where: { code: energyType.code },
      update: {},
      create: { ...energyType, allowedUnits: [...energyType.allowedUnits] },
    });
  }
  console.log(`Energianemek seedelve: ${INITIAL_ENERGY_TYPES.map((e) => e.code).join(", ")}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
