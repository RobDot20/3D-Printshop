import fs from 'node:fs/promises';

const TAIL_BUFFER_BYTES = 64 * 1024; // Read only the last 64 KB of the G-code file

/**
 * Converts PrusaSlicer time strings like "1d 2h 15m 40s", "2h 10m 5s", or "45m 12s" into total seconds.
 */
export function parseDurationToSeconds(timeString) {
  let totalSeconds = 0;

  const days = timeString.match(/(\d+)\s*d/);
  const hours = timeString.match(/(\d+)\s*h/);
  const minutes = timeString.match(/(\d+)\s*m/);
  const seconds = timeString.match(/(\d+)\s*s/);

  if (days) totalSeconds += Number.parseInt(days[1], 10) * 86400;
  if (hours) totalSeconds += Number.parseInt(hours[1], 10) * 3600;
  if (minutes) totalSeconds += Number.parseInt(minutes[1], 10) * 60;
  if (seconds) totalSeconds += Number.parseInt(seconds[1], 10);

  return totalSeconds;
}

/**
 * Reads the footer of a PrusaSlicer .gcode file and extracts printTimeSeconds and filamentGrams.
 */
export async function parsePrusaGcodeMetadata(gcodeFilePath, filamentDensity = 1.24) {
  const stat = await fs.stat(gcodeFilePath);
  const readSize = Math.min(stat.size, TAIL_BUFFER_BYTES);
  const startOffset = Math.max(0, stat.size - readSize);

  const handle = await fs.open(gcodeFilePath, 'r');
  let tailText = '';

  try {
    const buffer = Buffer.alloc(readSize);
    await handle.read(buffer, 0, readSize, startOffset);
    tailText = buffer.toString('utf8');
  } finally {
    await handle.close();
  }

  // 1. Parse estimated print time
  // Matches: "; estimated printing time (normal mode) = 1h 23m 45s"
  const timeMatch = tailText.match(
    /;\s*estimated printing time \(normal mode\)\s*=\s*([^\r\n]+)/i
  );
  if (!timeMatch) {
    throw new Error('Could not find estimated printing time in G-code footer.');
  }
  const printTimeSeconds = parseDurationToSeconds(timeMatch[1].trim());

  // 2. Parse filament weight in grams
  // Matches: "; total filament used [g] = 28.45" or "; filament used [g] = 28.45"
  const gramMatch = tailText.match(/;\s*(?:total\s+)?filament used \[g\]\s*=\s*([\d.]+)/i);
  let filamentGrams = gramMatch ? Number.parseFloat(gramMatch[1]) : 0;

  // Fallback: if PrusaSlicer output 0g (e.g., density not set in profile), compute from [cm3] or [mm]
  if (filamentGrams <= 0) {
    const cm3Match = tailText.match(/;\s*filament used \[cm3\]\s*=\s*([\d.]+)/i);
    if (cm3Match) {
      filamentGrams = Number.parseFloat(cm3Match[1]) * filamentDensity;
    } else {
      const mmMatch = tailText.match(/;\s*filament used \[mm\]\s*=\s*([\d.]+)/i);
      if (mmMatch) {
        const lengthMm = Number.parseFloat(mmMatch[1]);
        // Volume of 1.75mm diameter cylinder in cm3 = (pi * (0.875^2) * lengthMm) / 1000
        const volumeCm3 = (Math.PI * Math.pow(1.75 / 2, 2) * lengthMm) / 1000;
        filamentGrams = volumeCm3 * filamentDensity;
      }
    }
  }

  if (filamentGrams <= 0 || printTimeSeconds <= 0) {
    throw new Error(
      `Invalid parsed metrics (filamentGrams=${filamentGrams}, printTimeSeconds=${printTimeSeconds})`
    );
  }

  return {
    printTimeSeconds,
    filamentGrams: Number(filamentGrams.toFixed(2)),
  };
}
