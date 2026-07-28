import { prisma } from "@/lib/prisma";

// Ideiglenes kezdőlap az 1. build-lépéshez (adatmodell + validáció) — a
// SPEC.md 5.2 szerinti ügyfélválasztó a 2. lépésben (CRUD) készül el ehelyett.
// Egyelőre azt igazolja, hogy az adatbázis-kapcsolat és a Prisma Client
// ténylegesen működik egy valódi oldalról meghívva, nem csak a seed scriptből.
export default async function Home() {
  const energyTypes = await prisma.energyType.findMany({ orderBy: { name: "asc" } });

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="mb-1 font-mono text-xs uppercase tracking-wide text-muted">1. lépés — alapok</p>
      <h1 className="mb-6 font-display text-2xl font-semibold tracking-tight text-ink">
        Számlamenedzsment
      </h1>
      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Energianemek (seedelve, SPEC.md 3.2)
        </h2>
        <ul className="flex flex-col gap-2">
          {energyTypes.map((energyType) => (
            <li key={energyType.id} className="flex items-center justify-between text-sm">
              <span>{energyType.name}</span>
              <span className="font-mono text-muted">{energyType.allowedUnits.join(", ")}</span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
