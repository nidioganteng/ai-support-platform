# Phase Plan

Status legend: ✅ done · 🚧 in progress · ⬜ not started

## Phase 0 — Planning & Foundation ✅

**Goal:** a working, tested, typed monorepo skeleton — nothing product-specific yet.

- [x] pnpm workspace: `apps/{web,api,worker}`, `packages/{database,shared}`
- [x] Strict shared `tsconfig.base.json` (noUncheckedIndexedAccess, exactOptionalPropertyTypes, etc.)
- [x] ESLint (flat config) + Prettier at the root
- [x] Docker Compose: Postgres 16 + Redis 7, with healthchecks
- [x] `@app/shared`: zod env validation (`getEnv`) + shared domain types
- [x] `@app/database`: initial Prisma schema — Organization, User, Membership,
      KnowledgeSource, Conversation, Message (multi-tenant from day one)
- [x] `@app/api`: Express app with `GET /health`, pino logging, supertest coverage
- [x] `@app/worker`: BullMQ worker + repeatable heartbeat job, unit-tested processor
- [x] `@app/web`: Next.js (App Router) + Tailwind, placeholder dashboard shell
- [x] README with setup + verification commands

**Acceptance criteria:**
- `pnpm install` succeeds from a clean clone
- `pnpm typecheck` passes with zero errors across all packages
- `pnpm lint` passes with zero warnings
- `pnpm test` passes (env validation, health endpoint, heartbeat processor)
- `pnpm docker:up && pnpm db:push` creates all tables with no manual SQL
- `pnpm dev:api` → `curl localhost:4000/health` returns `{ status: "ok", ... }`
- `pnpm dev:worker` logs a processed heartbeat every 30s
- `pnpm dev:web` renders the placeholder dashboard at `localhost:3000`

## Phase 1 — Auth & Dashboard Shell ⬜

- Clerk integration in `apps/web` (sign in / sign up / organization switcher)
- On first login, create/link a `User` + `Membership` row via a Clerk webhook → `apps/api`
- Dashboard shell: sidebar with Knowledge Base / Conversations / Settings (empty states)
- Route protection (unauthenticated → redirect to sign-in)

**Acceptance criteria:** a new user can sign up, land in an empty dashboard scoped to their own organization, and cannot see another organization's data.

## Phase 2 — Knowledge Base: PDF & Text Upload ⬜

- Upload endpoint (`apps/api`) → stores file, enqueues a BullMQ job
- Worker job: extract text (`pdf-parse`), chunk (~500–1000 tokens), embed (OpenAI), upsert to Pinecone with `{ organizationId, sourceId, chunkIndex }` metadata
- `KnowledgeSource.status` transitions: `PENDING → PROCESSING → READY | FAILED`
- Dashboard: upload UI + status list

**Acceptance criteria:** uploading a PDF ends with `status: READY` and retrievable chunks in Pinecone scoped to the correct organization.

## Phase 3 — Website Crawling ⬜

- Crawl job: fetch + extract main content (strip nav/footer/ads), same chunk/embed pipeline as Phase 2
- Respect basic crawl limits (max pages, same-domain only, timeout)

**Acceptance criteria:** given a URL, the worker produces `READY` knowledge sources for the crawled pages without manual intervention.

## Phase 4 — RAG Chat Core ⬜

- `POST /chat`: embed the question → Pinecone similarity search (scoped to `organizationId`) → LangChain prompt assembly → OpenAI completion
- Response includes cited source chunks
- Persist `Conversation` + `Message` rows

**Acceptance criteria:** asking a question answerable from an uploaded doc returns a correct, source-cited answer; an out-of-scope question is declined rather than hallucinated.

## Phase 5 — Embeddable Widget ⬜

- Standalone JS snippet, loads a chat bubble, calls `/chat` with a public per-organization key
- Works when embedded in a plain static HTML page

## Phase 6 — Human Handoff & Tickets ⬜

- Low-confidence or explicit "talk to a human" → `Conversation.status = PENDING_HUMAN`
- Ticket queue in dashboard; Resend email notification to agents

## Phase 7 — Analytics ⬜

- Conversation volume, AI resolution rate vs. handoff rate, top questions
- Dashboard charts (Recharts)

## Phase 8 — Payments ⬜

- Stripe subscription (Free / Pro / Enterprise), usage limits enforced (docs count, monthly conversations)
- Billing page + webhook handling

## Phase 9 — Advanced Features ⬜

- Multi-language detection + response
- AI-suggested replies for agents handling a handed-off ticket

## Phase 10 — Polish & Production ⬜

- Rate limiting, structured error handling, log aggregation
- Full test pass, production Docker build, deploy
