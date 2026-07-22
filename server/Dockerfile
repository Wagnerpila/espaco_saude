FROM node:22-alpine

# Prisma precisa do openssl pra detectar a engine certa em Alpine (musl) —
# sem isso o container sobe mas quebra no primeiro acesso ao banco.
RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
COPY scripts ./scripts

RUN mkdir -p /app/uploads

EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
