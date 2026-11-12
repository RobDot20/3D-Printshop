// apps/api/src/lib/prisma.js
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// 1. Create a standard Postgres connection pool using your .env URL
const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// 2. Wrap it in the Prisma adapter
const adapter = new PrismaPg(pool);

// 3. Pass the adapter to PrismaClient
const prisma = new PrismaClient({ 
  adapter,
  log: ['warn', 'error']
});

// Use ES6 default export
export default prisma;
