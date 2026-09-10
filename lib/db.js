// Prisma client singleton.
// In dev, Next.js hot-reloads modules, which would otherwise create a new
// PrismaClient (and a new DB connection) on every edit. We stash the client
// on `global` to reuse it across reloads. In production, one instance is
// created and reused normally.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__modredPrisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__modredPrisma = prisma;
}
