import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import catalogRouter from './routes/catalog.js';
import filamentsRouter from './routes/filaments.js';
import quotesRouter from './routes/quotes.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Serve static catalog 3D models
app.use('/data/catalog', express.static(process.env.CATALOG_DIR || '/data/catalog'));

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'printshop-api', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/catalog', catalogRouter);
app.use('/api/filaments', filamentsRouter);
app.use('/api/quotes', quotesRouter);

// Multer & Upload Error Handler
app.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`printshop-api listening on http://localhost:${PORT}`);
});
