# Dockerfile para Backend NestJS
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist

# Instalar prisma globalmente para migrations automáticas no container se desejado
RUN npm install -g prisma

EXPOSE 3001

CMD ["sh", "-c", "prisma db push && node dist/main.js"]
