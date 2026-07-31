# Agent Rules

1.  **Architecture**: The project is a Next.js (frontend) and Express (API) + BullMQ (worker) application using Prisma and PostgreSQL.
2.  **No Supabase**: DO NOT introduce `@supabase/supabase-js`, `@supabase/ssr`, or any other Supabase dependency. We use local Postgres and Prisma.
3.  **Strict TypeScript**: Always enforce strict typing. Avoid `any`.
4.  **Testing**: Ensure you write and pass unit tests and follow TDD where applicable.
5.  **Graphify**: Run `graphify update .` (or `npx graphify@latest update .`) after modifying code structure or logic, so the knowledge graph is kept up to date.
