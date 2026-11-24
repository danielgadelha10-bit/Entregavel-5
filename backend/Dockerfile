# Multi-stage Dockerfile para Backend NestJS
FROM node:22-alpine AS builder

WORKDIR /app
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

COPY . .
RUN npm run build
RUN npx tsc prisma/seed.ts --outDir prisma-dist --module commonjs --target ES2021 --esModuleInterop --skipLibCheck

# Stage 2: Runtime
FROM node:22-alpine AS runner

WORKDIR /app
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma-dist ./prisma-dist

# CLI do Prisma na mesma versão do projeto para aplicar o schema no startup
RUN npm install -g prisma@6.19.3

EXPOSE 3001

CMD ["sh", "-c", "prisma db push --skip-generate && node prisma-dist/seed.js && node dist/main.js"]
