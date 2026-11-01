import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = util.promisify(exec);

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
  maxRetriesPerRequest: null
});

console.log('Slicer Worker: Connected to Redis and waiting for slicing jobs...');

const slicerWorker = new Worker('slicing-queue', async (job) => {
  const { uploadId, stlFilename } = job.data;

  const inputStl = path.join('/data/uploads', stlFilename);
  const outputGcode = path.join('/data/gcode', `${uploadId}.gcode`);
  const profilePath = path.join('/app/profiles', 'standard_pla.ini');

  if (!fs.existsSync(inputStl)) {
    throw new Error(`STL file not found at ${inputStl}`);
  }

  await job.updateProgress(10);
  console.log(`[Job ${job.id}] Slicing ${stlFilename}...`);

  const command = `prusa-slicer --load ${profilePath} --export-gcode ${inputStl} --output ${outputGcode}`;
  await execAsync(command);

  await job.updateProgress(100);
  console.log(`[Job ${job.id}] Slicing complete: ${outputGcode}`);

  return { success: true, gcodePath: outputGcode };
}, { connection: redisConnection });

slicerWorker.on('failed', (job, err) => {
  console.error(`[Job ${job?.id}] Failed: ${err.message}`);
});
