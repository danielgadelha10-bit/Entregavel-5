# Dockerfile para Backend NestJS - Pronto para Amazon ECS / ECR
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependências (incluindo devDependencies para compilação)
RUN npm ci

# Gerar Prisma Client
RUN npx prisma generate

# Copiar código-fonte e compilar
COPY . .
RUN npm run build

# Stage 2: Imagem final de produção enxuta e segura
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Instalar dependências apenas de produção
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev

# Copiar build e prisma client gerado do builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist

# Adicionar usuário não-root por segurança
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

EXPOSE 3001

CMD ["node", "dist/main.js"]
