import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import { requireAuth } from '../middleware/auth.js';

export const uploadsRouter = Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve('uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

// Substitui base44.integrations.Core.UploadFile — mesma forma de resposta
// ({ file_url }) usada hoje em UserProfileModal.jsx e MedicalRecordForm.jsx.
uploadsRouter.post('/', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  const base = (process.env.PUBLIC_UPLOADS_URL || '/uploads').replace(/\/$/, '');
  res.json({ file_url: `${base}/${req.file.filename}`, file_name: req.file.originalname });
});
