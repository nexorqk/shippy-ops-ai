import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function ensureDemoUser() {
  return prisma.user.upsert({
    where: { email: "demo@shippy-ops-ai.local" },
    update: {},
    create: {
      email: "demo@shippy-ops-ai.local",
      name: "Demo User",
      referralCode: "DEMOLOCAL"
    }
  });
}
