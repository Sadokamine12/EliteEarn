# VIP Platform

Initial monorepo scaffold for the VIP task platform. This first slice includes:

- shared PostgreSQL access and SQL migration runner
- shared auth guards/decorators
- shared RabbitMQ publisher wrapper
- `apps/identity-service` with register, login, refresh, profile, admin user, status, and balance adjustment endpoints
- `apps/frontend` with Vite, React, Tailwind, Zustand, Socket.IO hooks, user flows, and admin dashboard pages

## Commands

```bash
npm install
npm run migrate
npm run dev:identity
npm run dev:wallet
npm run dev:frontend
npm run build
npm run build:frontend
```

## Docker

```bash
docker compose up --build
```

## Environment

Copy `.env.example` to `.env` and provide RS256 key pairs for access and refresh tokens.
The repo now supports per-service local ports via `IDENTITY_SERVICE_PORT` and `WALLET_SERVICE_PORT`.

For the frontend, copy [apps/frontend/.env.example](/Users/sadokamine/Projects/EliteEarn/apps/frontend/.env.example) to `apps/frontend/.env` if you want to override the default local API and promo settings.
