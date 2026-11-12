// apps/api/prisma/seed.js
import prisma from '../src/lib/prisma.js';

async function main() {
  console.log('Seeding printshop-db...');

  // Using upsert so running the seed multiple times won't create duplicates!
  const plaBlack = await prisma.filament.create({
    data: {
      name: 'Matte Galaxy Black',
      brand: 'Polymaker',
      materialType: 'PLA',
      colorHex: '#1E1E1E',
      pricePerGram: 0.15,
      densityGPerCm3: 1.24,
      nozzleTempC: 210,
      bedTempC: 60,
      spoolWeightG: 1000,
    },
  });

  const petgOrange = await prisma.filament.create({
    data: {
      name: 'Prusa Orange',
      brand: 'Prusament',
      materialType: 'PETG',
      colorHex: '#FF6B00',
      pricePerGram: 0.18,
      densityGPerCm3: 1.27,
      nozzleTempC: 240,
      bedTempC: 80,
      spoolWeightG: 1000,
    },
  });

  await prisma.catalogModel. upsert({
    where: { slug: 'articulated-flexi-dragon' },
    update: {},
    create: {
      title: 'Articulated Flexi Dragon',
      slug: 'articulated-flexi-dragon',
      description: 'Print-in-place articulated dragon. Zero assembly required.',
      category: 'Desk Toys',
      stlFilePath: '/data/catalog/flexi_dragon.stl',
      thumbnailUrl: '/data/catalog/thumbnails/flexi_dragon.webp',
      basePrice: 45.00,
      estimatedWeightG: 68.5,
      estimatedTimeSec: 16200,
      dimensionsMm: { x: 145, y: 95, z: 32 },
      popularityScore: 42,
      isFeatured: true,
    },
  });

  await prisma.catalogModel.upsert({
    where: { slug: 'honeycomb-desk-organizer' },
    update: {},
    create: {
      title: 'Honeycomb Desk Organizer',
      slug: 'honeycomb-desk-organizer',
      description: 'Modular hexagonal pen, SD card, and USB drive holder.',
      category: 'Organizers',
      stlFilePath: '/data/catalog/honeycomb_organizer.stl',
      thumbnailUrl: '/data/catalog/thumbnails/honeycomb_organizer.webp',
      basePrice: 28.00,
      estimatedWeightG: 42.0,
      estimatedTimeSec: 9000,
      dimensionsMm: { x: 110, y: 80, z: 95 },
      popularityScore: 27,
      isFeatured: true,
    },
  });

  console.log('Seeded filaments and catalog models:', {
    plaBlackId: plaBlack.id,
    petgOrangeId: petgOrange.id,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
