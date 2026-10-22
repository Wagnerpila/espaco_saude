import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
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

  // gzip: o bundle do frontend tem ~2MB sem compressão — em 3G/4G fraco no
  // celular isso demorava a ponto de parecer tela branca.
  app.use(compression());
  app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: '5mb' }));
  app.use('/uploads', express.static(UPLOAD_DIR));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  // Telemetria de carregamento do frontend (script inline em index.html):
  // registra no log do container em que etapa o app parou em cada aparelho
  // (boot, erro, montou ou não) junto com o user-agent — usado pra depurar
  // tela branca em celulares que não temos em mãos. Sem auth de propósito
  // (roda antes do login); payload truncado pra não encher o log.
  app.post('/api/client-log', express.text({ type: '*/*', limit: '16kb' }), (req, res) => {
    const body = typeof req.body === 'string' ? req.body.slice(0, 4000) : JSON.stringify(req.body || {}).slice(0, 4000);
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log(`[client-log] ip=${ip} ua="${req.headers['user-agent'] || ''}" ${body.replace(/\s+/g, ' ')}`);
    res.status(204).end();
  });

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
    // express.static ignora pastas com ponto; o assetlinks.json do APK (TWA)
    // precisa ser servido em /.well-known pro Android abrir o app sem a barra
    // do navegador.
    app.use('/.well-known', express.static(path.join(FRONTEND_DIST_DIR, '.well-known')));
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
