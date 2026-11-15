import 'dotenv/config';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';
import prisma from './lib/prisma.js';
import { parsePrusaGcodeMetadata } from './lib/gcodeParser.js';
import { calculateQuotePrice } from './lib/pricing.js';

const execFileAsync = promisify(execFile);

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads';
const GCODE_DIR = process.env.GCODE_DIR || '/data/gcode';
const PRUSA_SLICER_BIN = process.env.PRUSA_SLICER_BIN || 'prusa-slicer';
const SLICING_QUEUE_NAME = 'slicing-queue';

const redisConnection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });

async function processSlicingJob(job) {
  const { quoteId, stlFileName, layerHeight, infill, filament } = job.data;

  const inputStlPath = path.join(UPLOAD_DIR, stlFileName);
  const gcodeFileName = stlFileName.replace(/\.stl$/i, '.gcode');
  const outputGcodePath = path.join(GCODE_DIR, gcodeFileName);

  console.log(`[Worker] Starting job ${job.id} for Quote ${quoteId} (${stlFileName})`);

  await fs.mkdir(GCODE_DIR, { recursive: true });

  // 1. Build safe CLI arguments for PrusaSlicer
  // --ensure-on-bed drops floating geometry to Z=0; --center aligns it on a 220x220mm Ender 3 bed
  const cliArgs = [
    '--export-gcode',
    '--center', '110,110',
    '--ensure-on-bed',
    '--layer-height', String(layerHeight),
    '--first-layer-height', '0.2',
    '--fill-density', `${infill}%`,
    '--filament-diameter', '1.75',
    '--filament-density', String(filament.density || 1.24),
    '--nozzle-diameter', '0.4',
    '--perimeters', '3',
    '--output', outputGcodePath,
    inputStlPath,
  ];

  // Optional: If you have a base printer profile .ini mounted, prepend: '--load', '/app/profiles/ender3.ini'
  if (process.env.PRUSA_PROFILE_PATH) {
    cliArgs.unshift('--load', process.env.PRUSA_PROFILE_PATH);
  }

  // 2. Run headless PrusaSlicer CLI with a 60-second timeout
  await execFileAsync(PRUSA_SLICER_BIN, cliArgs, {
    timeout: 60_000,
    maxBuffer: 10 * 1024 * 1024,
  });

  // 3. Parse the generated G-code footer for time and filament mass
  const { printTimeSeconds, filamentGrams } = await parsePrusaGcodeMetadata(
    outputGcodePath,
    filament.density
  );

  // 4. Calculate total quote price
  const { totalPrice } = calculateQuotePrice({
    filamentGrams,
    printTimeSeconds,
    pricePerGram: filament.pricePerGram,
  });

  // 5. Update CustomQuote record in PostgreSQL to COMPLETED
  const updatedQuote = await prisma.customQuote.update({
    where: { id: quoteId },
    data: {
      status: 'COMPLETED',
      gcodePath: gcodeFileName,
      printTimeSeconds,
      filamentGrams,
      totalPrice,
    },
  });

  console.log(
    `[Worker] Completed Quote ${quoteId}: ${filamentGrams}g, ${printTimeSeconds}s -> Price: ${totalPrice}`
  );

  return updatedQuote;
}

const worker = new Worker(
  SLICING_QUEUE_NAME,
  async (job) => {
    try {
      return await processSlicingJob(job);
    } catch (error) {
      console.error(`[Worker] Job ${job.id} failed:`, error.message);

      // Mark the quote as FAILED in PostgreSQL so the frontend stops polling
      if (job.data?.quoteId) {
        await prisma.customQuote
          .update({
            where: { id: job.data.quoteId },
            data: { status: 'FAILED' },
          })
          .catch((dbErr) => console.error('[Worker] Failed to update quote status:', dbErr));
      }

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 1, // Process 1 slice at a time to respect 1.50 CPU / 1536M RAM limit
  }
);

worker.on('ready', () => {
  console.log('[Worker] printshop-slicer worker connected to Redis and waiting for jobs...');
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} permanently failed: ${err.message}`);
});
