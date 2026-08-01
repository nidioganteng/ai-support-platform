# AI Support Platform

Multi-tenant AI-powered customer support platform. Businesses upload docs,
FAQs, PDFs, and websites; customers get 24/7 AI-answered support backed by
that content (RAG), with handoff to a human agent when needed.

See [`docs/phase-plan.md`](./docs/phase-plan.md) for the full build roadmap
and current status.

## Stack

- **Web**: Next.js (App Router) + Tailwind CSS
- **API**: Node.js + Express + TypeScript
- **Worker**: Node.js + BullMQ (background jobs: PDF parsing, crawling, embeddings)
- **Database**: PostgreSQL + Prisma
- **Vector DB**: Pinecone
- **AI**: OpenAI + LangChain
- **Infra**: Docker (Postgres + Redis locally), BullMQ on Redis
- **Integrations**: Clerk (auth), Resend (email), Stripe (billing)

## Prerequisites

- Node.js >= 20
- pnpm (`npm install -g pnpm`)
- Docker (for local Postgres + Redis)

## Getting started

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env template and fill in secrets as you reach the phase that needs them
cp .env.example .env

# 3. Start Postgres + Redis
pnpm docker:up

# 4. Run Prisma schema migration
pnpm db:generate
pnpm db:migrate

# 5. Run all services concurrently (or individually)
pnpm dev          # Runs API, Worker, and Web concurrently

# Or run services individually in separate terminals if preferred:
pnpm dev:api      # http://localhost:4000/health
pnpm dev:worker   # BullMQ background job processor
pnpm dev:web      # http://localhost:3000
```

## Verifying the foundation

```bash
pnpm typecheck   # strict TS across every package
pnpm lint        # ESLint across every package
pnpm test        # vitest across every package
```

## Monorepo layout

```
apps/
  web/      Next.js dashboard (client-facing UI)
  api/      Express REST API
  worker/   BullMQ background job processor
packages/
  database/ Prisma schema + generated client, shared by api & worker
  shared/   Env validation (zod) + cross-app TypeScript types
infrastructure/
  docker/   docker-compose.yml (Postgres + Redis)
docs/
  phase-plan.md   Full phased roadmap + acceptance criteria
```
