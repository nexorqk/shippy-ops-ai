import { Queue } from "bullmq";

export type FullGenerationQueueData = {
  generationJobId: string;
  projectId: string;
  userId: string;
};

export const fullGenerationQueueName = "full-generation";

export function createRedisConnection() {
  const url = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");

  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password || undefined,
    username: url.username || undefined,
    maxRetriesPerRequest: null
  };
}

export const fullGenerationQueue = new Queue<FullGenerationQueueData>(fullGenerationQueueName, {
  connection: createRedisConnection()
});
