FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json ./
RUN npm install

COPY tsconfig.base.json tsconfig.json ./
COPY apps ./apps
COPY libs ./libs
COPY migrations ./migrations

RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migrations ./migrations

EXPOSE 3001
CMD ["sh", "-c", "node dist/libs/database/src/run-migrations.js && node dist/apps/identity-service/src/main.js"]
