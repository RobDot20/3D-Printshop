import express from 'express';
import cors from 'cors';
import { PRINTER_BED_MM } from '@printshop/shared';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', printerBed: PRINTER_BED_MM });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API Server listening on port ${PORT}`);
});
