import { prisma } from "../db.js";

export function currentBillingPeriod(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function assertFastPlanLimit(userId: string) {
  const billingPeriod = currentBillingPeriod();
  const count = await prisma.usageRecord.aggregate({
    where: { userId, type: "fast_plan", billingPeriod },
    _sum: { quantity: true }
  });

  const used = count._sum.quantity ?? 0;
  if (used >= 3) {
    const error = new Error("Free plan limit reached: 3 fast deployment plans per month.");
    error.name = "UsageLimitError";
    throw error;
  }

  return { billingPeriod, remaining: 3 - used };
}
