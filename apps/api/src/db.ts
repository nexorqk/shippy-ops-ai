import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function ensureDemoUser() {
  return prisma.user.upsert({
    where: { email: "demo@shippy-ops-ai.local" },
    update: { role: "admin" },
    create: {
      email: "demo@shippy-ops-ai.local",
      name: "Demo User",
      role: "admin",
      referralCode: "DEMOLOCAL"
    }
  });
}
