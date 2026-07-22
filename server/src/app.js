import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { authRouter } from './routes/auth.routes.js';
import { entitiesRouter } from './routes/entities.routes.js';
import { uploadsRouter } from './routes/uploads.routes.js';
import { functionsRouter } from './routes/functions.routes.js';
import { webhooksRouter } from './routes/webhooks.routes.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve('uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: '5mb' }));
  app.use('/uploads', express.static(UPLOAD_DIR));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/auth', authRouter);
  app.use('/api/entities', entitiesRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/functions', functionsRouter);
  app.use('/api/webhooks', webhooksRouter);
  // Fase seguinte liga aqui: /api/agent

  // Serve o build do frontend (Vite) direto pelo mesmo processo/container —
  // simplifica o deploy no EasyPanel (um serviço, um domínio, um certificado)
  // em vez de precisar de um Nginx separado só pra servir arquivos estáticos.
  // Sem efeito em dev, onde FRONTEND_DIST_DIR não existe (o Vite dev server
  // já serve o frontend em outra porta).
  const FRONTEND_DIST_DIR = process.env.FRONTEND_DIST_DIR || path.resolve('public');
  if (fs.existsSync(FRONTEND_DIST_DIR)) {
    app.use(express.static(FRONTEND_DIST_DIR));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
      res.sendFile(path.join(FRONTEND_DIST_DIR, 'index.html'));
    });
  }

  app.use((err, _req, res, _next) => {
    console.error(err);
    const status = err.status || (err.code === 'P2025' ? 404 : 500);
    // Erros de validação do Prisma (ex.: campo obrigatório ausente/nulo) vêm
    // com o payload inteiro despejado na mensagem — útil no log, péssimo pra
    // mostrar direto ao usuário (vários telas fazem alert(error.message)).
    const isPrismaValidationError = err.name === 'PrismaClientValidationError' || /^Invalid `prisma\./.test(err.message || '');
    const message = isPrismaValidationError
      ? 'Dados inválidos ou campo obrigatório não preenchido.'
      : err.publicMessage || err.message || 'Erro interno';
    res.status(status).json({ error: message });
  });

  return app;
}
