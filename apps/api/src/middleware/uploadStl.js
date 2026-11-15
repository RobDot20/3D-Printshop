import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

export const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads';

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      cb(null, UPLOAD_DIR);
    } catch (err) {
      cb(err, UPLOAD_DIR);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== '.stl') {
    return cb(new Error('Only .stl 3D model files are allowed.'), false);
  }
  cb(null, true);
};

export const uploadStl = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB max file size
  },
});

/**
 * Verifies that an uploaded .stl file is either a valid ASCII STL (starts with "solid")
 * or a valid Binary STL (80-byte header + 4-byte uint32 triangle count * 50 bytes == file size).
 */
export async function validateStlStructure(filePath) {
  const stat = await fs.stat(filePath);
  if (stat.size < 84) {
    return false;
  }

  const handle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(84);
    await handle.read(buffer, 0, 84, 0);

    const headerText = buffer.subarray(0, 5).toString('utf8').toLowerCase();
    const triangleCount = buffer.readUInt32LE(80);
    const expectedBinarySize = 84 + triangleCount * 50;

    // Valid binary STL matches exact byte formula; valid ASCII STL starts with "solid"
    if (expectedBinarySize === stat.size || headerText === 'solid') {
      return true;
    }
    return false;
  } finally {
    await handle.close();
  }
}
