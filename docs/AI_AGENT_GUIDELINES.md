# AI Agent Guidelines

## Do's
- **Understand the Architecture**: This is a monorepo (`apps/web`, `apps/api`, `apps/worker`, `packages/database`, `packages/shared`). Internal packages are referenced via `workspace:*` (e.g., `@app/web`, `@app/api`). Always import shared logic through these package names, never with relative `../../packages/...` paths.
- **Use TypeScript Strictly**: Maintain strict typing (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`). Avoid `any`. Use `zod` for validation from `@app/shared`. For optional fields, build objects conditionally rather than using `undefined` in ternaries.
- **Pure Logic Separation**: Separate pure logic from I/O wiring. For example, a BullMQ job should have a plain function tested directly, and a thin `Worker` wrapper around it. Follow this split for new services, keeping `app.ts` (Express factory) separate from `server.ts`.
- **Typing Express Routers**: Exported Express `Router` or similar values MUST have an explicit type annotation (e.g., `export const fooRouter: Router = Router()`) to satisfy `tsc` with `declaration: true`.
- **CJS Packages**: For CJS packages under `module: NodeNext`, prefer named imports over default imports when types export both (e.g., `import { pinoHttp } from 'pino-http'`).
- **Database**: Use Prisma (`@app/database`). Do not write raw SQL unless absolutely necessary and documented.
- **Run Checks**: Always run `pnpm typecheck`, `pnpm lint`, and `pnpm test` before considering any change finished. The whole repo currently passes all three with zero errors/warnings.
- **Update Graphify**: Run `npx graphify@latest update .` whenever you make structural changes or significant code additions.

## Don'ts
- **NEVER Commit Code**: The AI's job is only to prepare and write the commit message — the human always runs `git commit` themselves. When a commit is needed, output the message in a code block and stop there. Do not run `git add`, `git commit`, `git push`, or any other git write command unless the human explicitly overrides this rule.
- **No Hallucinations**: Do not assume any model, route, or UI exists beyond what's listed in the current phase or `CLAUDE.md`. Always verify by reading the code.
- **Avoid Supabase**: This project uses local PostgreSQL with Prisma and Express API. Do not introduce Supabase dependencies.
- **AI is not the Source of Truth**: The AI layer only ever answers from retrieved context (RAG). It must never be the source of truth for anything transactional (pricing, account state, refunds, etc.). Such actions must be deterministic application code the AI can *request*, not do directly.
