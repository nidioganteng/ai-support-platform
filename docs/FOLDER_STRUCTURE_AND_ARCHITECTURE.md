# Folder Structure and Architecture

## Monorepo Layout
Package manager is **pnpm**. Do not introduce `package-lock.json` or `yarn.lock`. Internal packages are linked via `workspace:*` and imported using `@app/*`.

### Applications (`apps/`)
- **`apps/web`**: Next.js dashboard — client-facing UI businesses use to manage their assistant.
- **`apps/api`**: Express REST API — public/dashboard-facing HTTP endpoints.
- **`apps/worker`**: BullMQ job processor — handles PDF parsing, crawling, embeddings, and anything slow/async.

### Packages (`packages/`)
- **`packages/database`**: Prisma schema + generated client (`packages/database/prisma.ts` exports `prisma`).
- **`packages/shared`**: Zod env validation (`getEnv()`) + cross-app TypeScript types.

## Infrastructure (`infrastructure/`)
- **`infrastructure/docker`**: `docker-compose.yml` for Postgres 16 + Redis 7 for local dev.

## High-Level Architecture Principles
1. **Upload Flow**: User uploads PDF via `web` -> `api` receives file, saves it, creates DB record -> `api` enqueues BullMQ job -> `worker` extracts text, chunks it, calls OpenAI to embed, and upserts to Pinecone.
2. **Chat Flow (RAG)**: User asks question via widget/dashboard -> `api` receives request, embeds query -> searches Pinecone for similar chunks -> assembles LangChain prompt -> calls OpenAI for response -> `api` streams response back to `web`.
3. **Pure Logic**: Core logic must be separated from I/O to enable easy unit testing (e.g., `app.ts` separated from `server.ts` for supertest).
