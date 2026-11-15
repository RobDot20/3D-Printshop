import { Router } from 'express';
import fs from 'node:fs/promises';
import prisma from '../lib/prisma.js';
import { slicingQueue } from '../lib/queue.js';
import { uploadStl, validateStlStructure } from '../middleware/uploadStl.js';

const router = Router();

const ALLOWED_LAYER_HEIGHTS = [0.12, 0.2, 0.28];

/**
 * POST /api/quotes
 * Multipart form fields:
 * - model: .stl file
 * - filamentId: string (UUID / ID of chosen Filament)
 * - layerHeight: number (0.12, 0.20, or 0.28)
 * - infill: number (10 to 100)
 */
router.post('/', uploadStl.single('model'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Missing .stl file in "model" field.' });
  }

  const uploadedFilePath = req.file.path;

  try {
    // 1. Verify binary/ASCII STL integrity
    const isValidStl = await validateStlStructure(uploadedFilePath);
    if (!isValidStl) {
      await fs.unlink(uploadedFilePath).catch(() => {});
      return res.status(400).json({ error: 'Uploaded file is not a valid binary or ASCII STL mesh.' });
    }

    // 2. Parse & validate slicing parameters
    const { filamentId } = req.body;
    const layerHeight = Number.parseFloat(req.body.layerHeight ?? '0.2');
    const infill = Number.parseInt(req.body.infill ?? '20', 10);

    if (!filamentId) {
      await fs.unlink(uploadedFilePath).catch(() => {});
      return res.status(400).json({ error: 'filamentId is required.' });
    }

    if (!ALLOWED_LAYER_HEIGHTS.includes(layerHeight)) {
      await fs.unlink(uploadedFilePath).catch(() => {});
      return res.status(400).json({
        error: `Invalid layerHeight. Allowed values: ${ALLOWED_LAYER_HEIGHTS.join(', ')} mm.`,
      });
    }

    if (Number.isNaN(infill) || infill < 10 || infill > 100) {
      await fs.unlink(uploadedFilePath).catch(() => {});
      return res.status(400).json({ error: 'infill must be an integer between 10 and 100.' });
    }

    // 3. Verify filament exists and is in stock
    const filament = await prisma.filament.findUnique({
      where: { id: filamentId },
    });

    if (!filament || !filament.inStock) {
      await fs.unlink(uploadedFilePath).catch(() => {});
      return res.status(404).json({ error: 'Selected filament is not found or out of stock.' });
    }

    // 4. Create the CustomQuote record with status QUEUED
    const quote = await prisma.customQuote.create({
      data: {
        originalName: req.file.originalname,
        stlPath: req.file.filename, // Store relative filename so both host & container resolve it
        layerHeight,
        infill,
        status: 'QUEUED',
        filamentId: filament.id,
      },
      include: {
        filament: true,
      },
    });

    // 5. Push job to BullMQ slicing-queue
    await slicingQueue.add(
      'slice-stl',
      {
        quoteId: quote.id,
        stlFileName: req.file.filename,
        layerHeight,
        infill,
        filament: {
          id: filament.id,
          material: filament.material,
          pricePerGram: Number(filament.pricePerGram),
          density: Number(filament.density || 1.24),
        },
      },
      { jobId: `quote-${quote.id}` }
    );

    return res.status(202).json({
      message: 'Model uploaded and queued for slicing.',
      quote,
    });
  } catch (error) {
    console.error('[POST /api/quotes] Error:', error);
    await fs.unlink(uploadedFilePath).catch(() => {});
    return res.status(500).json({ error: 'Failed to enqueue custom quote.' });
  }
});

/**
 * GET /api/quotes/:id
 * Polled by the React client to check slicing progress and retrieve final price.
 */
router.get('/:id', async (req, res) => {
  try {
    const quote = await prisma.customQuote.findUnique({
      where: { id: req.params.id },
      include: {
        filament: {
          select: {
            id: true,
            name: true,
            material: true,
            colorName: true,
            colorHex: true,
            pricePerGram: true,
          },
        },
      },
    });

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found.' });
    }

    return res.json(quote);
  } catch (error) {
    console.error('[GET /api/quotes/:id] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch quote status.' });
  }
});

export default router;
