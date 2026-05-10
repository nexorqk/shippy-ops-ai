import "dotenv/config";
import { Worker } from "bullmq";
import { prisma } from "./db.js";
import { processFullGenerationJob } from "./jobs/full-generation.js";
import { createRedisConnection, fullGenerationQueueName, type FullGenerationQueueData } from "./lib/queue.js";

const worker = new Worker<FullGenerationQueueData>(
  fullGenerationQueueName,
  async (job) => {
    await processFullGenerationJob(job.data);
  },
  {
    connection: createRedisConnection(),
    concurrency: Number(process.env.WORKER_CONCURRENCY ?? 2)
  }
);

worker.on("completed", (job) => {
  console.log(`Completed full generation queue job ${job.id}`);
});

worker.on("failed", async (job, error) => {
  console.error(`Failed full generation queue job ${job?.id ?? "unknown"}`, error);

  const generationJobId = job?.data.generationJobId;
  if (!generationJobId) return;

  await prisma.$transaction([
    prisma.generationEvent.create({
      data: {
        jobId: generationJobId,
        type: "failed",
        message: error.message
      }
    }),
    prisma.generationJob.update({
      where: { id: generationJobId },
      data: {
        status: "failed",
        currentStep: "failed",
        errorMessage: error.message,
        completedAt: new Date()
      }
    })
  ]);
});

async function shutdown(signal: string) {
  console.log(`Received ${signal}, closing worker.`);
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
