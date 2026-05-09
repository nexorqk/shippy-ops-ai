import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function ensureDemoUser() {
  return prisma.user.upsert({
    where: { email: "demo@deploypilot.local" },
    update: {},
    create: {
      email: "demo@deploypilot.local",
      name: "Demo User",
      referralCode: "DEMOLOCAL"
    }
  });
}
