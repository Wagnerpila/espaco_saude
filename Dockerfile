# Imagem única (frontend + backend) pensada pro deploy via EasyPanel — um
# container, uma porta, um domínio, sem precisar de Nginx separado (o
# Traefik do EasyPanel já cuida do proxy/HTTPS). Buildar com o contexto na
# RAIZ do repositório (não em server/).

# ---- Stage 1: build do frontend (Vite) ----
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY index.html vite.config.js jsconfig.json tailwind.config.js postcss.config.js components.json ./
COPY src ./src
RUN npm run build

# ---- Stage 2: backend + build do frontend embutido ----
FROM node:22-alpine

# Prisma precisa do openssl pra detectar a engine certa em Alpine (musl) —
# sem isso o container sobe mas quebra no primeiro acesso ao banco.
RUN apk add --no-cache openssl

WORKDIR /app

COPY server/package.json server/package-lock.json* ./
RUN npm install --omit=dev

COPY server/prisma ./prisma
RUN npx prisma generate

COPY server/src ./src
COPY server/scripts ./scripts
RUN mkdir -p /app/uploads

COPY --from=frontend-build /app/dist ./public

EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
