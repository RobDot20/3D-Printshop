import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const redisConnection = new IORedis(process.env.REDIS_URL,
 { maxRetriesPerRequest: null });

export const SLICING_QUEUE_NAME = 'slicing-queue';

export const slicingQueue = new Queue(SLICING_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});
