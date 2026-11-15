// apps/api/src/routes/filaments.js
import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

/**
 * GET /api/filaments
 * Query params:
 *   - materialType (optional): e.g., /api/filaments?materialType=PLA
 *   - includeOutOfStock (optional): defaults to false so customers only see available spools
 */
router.get('/', async (req, res) => {
  try {
    const { materialType, includeOutOfStock } = req.query;

    const whereClause = {};
    if (includeOutOfStock !== 'true') {
      whereClause.inStock = true;
    }
    if (materialType) {
      whereClause.materialType = String(materialType).toUpperCase();
    }

    const filaments = await prisma.filament.findMany({
      where: whereClause,
      orderBy: [
        { materialType: 'asc' },
        { name: 'asc' },
      ],
    });

    const formattedFilaments = filaments.map((filament) => ({
      ...filament,
      pricePerGram: Number(filament.pricePerGram),
    }));

    res.json({
      count: formattedFilaments.length,
      items: formattedFilaments,
    });
  } catch (error) {
    console.error('[GET /api/filaments] Database error:', error);
    res.status(500).json({ error: 'Failed to fetch filaments.' });
  }
});

export default router;
