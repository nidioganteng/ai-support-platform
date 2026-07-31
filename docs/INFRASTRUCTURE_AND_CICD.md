# Infrastructure and CI/CD

## Infrastructure Setup
This project uses Docker Compose for local infrastructure.

### Services
- **PostgreSQL (16)**: Primary relational database.
- **Redis (7)**: Cache and message broker for BullMQ.

### Commands
- Start infrastructure: `pnpm docker:up` (runs `docker compose up -d`)
- Stop infrastructure: `pnpm docker:down`

## Environment Variables
Copy `.env.example` to `.env` in the root directory. Key variables include:
- `DATABASE_URL`: PostgreSQL connection string.
- `REDIS_URL`: Redis connection string.
- `PORT`: API port (default 4000).
- `OPENAI_API_KEY`: Required for embedding and RAG.
- `PINECONE_API_KEY`: Required for vector search.
- `CLERK_SECRET_KEY` / `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: For authentication.

## CI/CD Pipeline (To Be Implemented)
- **CI**: GitHub Actions will run `pnpm typecheck`, `pnpm lint`, and `pnpm test` on all PRs to `main`.
- **CD**: Production deployment uses Dockerfiles (`apps/api/Dockerfile`, `apps/worker/Dockerfile`) and a `docker-compose.prod.yml` configuration (Phase 10).
