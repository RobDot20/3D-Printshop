// apps/api/src/routes/catalog.js
import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

/**
 * GET /api/catalog
 * Query params:
 *   - category (optional): e.g., /api/catalog?category=Desk%20Toys
 *   - featured (optional): e.g., /api/catalog?featured=true
 *   - limit (optional): number of items to return (default 20)
 */
router.get('/', async (req, res) => {
  try {
    const { category, featured, limit = 20 } = req.query;

    // Build dynamic Prisma filter object based on query params
    const whereClause = {};
    if (category) {
      whereClause.category = String(category);
    }
    if (featured === 'true') {
      whereClause.isFeatured = true;
    }

    const models = await prisma.catalogModel.findMany({
      where: whereClause,
      orderBy: [
        { popularityScore: 'desc' }, // Most popular orders first for the front page
        { createdAt: 'desc' },
      ],
      take: Math.min(Number(limit) || 20, 50), // Cap at 50 items per request
    });

    // Convert Prisma Decimal to standard Number for easier frontend consumption
    const formattedModels = models.map((model) => ({
      ...model,
      basePrice: Number(model.basePrice),
    }));

    res.json({
      count: formattedModels.length,
      items: formattedModels,
    });
  } catch (error) {
    console.error('[GET /api/catalog] Database error:', error);
    res.status(500).json({ error: 'Failed to fetch catalog models.' });
  }
});

/**
 * GET /api/catalog/:slug
 * Fetches a single catalog model by its unique slug for the 3D product page
 */
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const model = await prisma.catalogModel.findUnique({
      where: { slug },
    });

    if (!model) {
      return res.status(404).json({ error: 'Catalog model not found.' });
    }

    res.json({
      ...model,
      basePrice: Number(model.basePrice),
    });
  } catch (error) {
    console.error(`[GET /api/catalog/${req.params.slug}] Database error:`, error);
    res.status(500).json({ error: 'Failed to fetch catalog model details.' });
  }
});

export default router;
