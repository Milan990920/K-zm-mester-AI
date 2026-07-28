import { PrismaClient } from "@prisma/client";

// Next.js dev módban modulokat újratölt — singleton nélkül minden hot-reload
// új adatbázis-kapcsolatot nyitna.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
