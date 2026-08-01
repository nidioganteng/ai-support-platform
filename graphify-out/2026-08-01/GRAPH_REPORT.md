# Graph Report - ai-support-platform  (2026-08-01)

## Corpus Check
- 57 files · ~5,263 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 414 nodes · 410 edges · 42 communities (31 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `114735d8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- GitFlow and Conventions
- worker/package.json
- api/package.json
- database/package.json
- server.ts
- dependencies
- worker/src/index.ts
- Phase Plan
- compilerOptions
- devDependencies
- scripts
- shared/package.json
- compilerOptions
- devDependencies
- database/tsconfig.json
- compilerOptions
- compilerOptions
- shared/tsconfig.json
- .prettierrc.json
- layout.tsx
- app/page.tsx
- AGENTS.md
- graphify.md
- next.config.mjs
- next-env.d.ts
- tailwind.config.ts
- prisma.ts
- middleware.ts
- dashboard/layout.tsx
- global.d.ts
- devDependencies
- Folder Structure and Architecture
- Infrastructure and CI/CD

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `scripts` - 13 edges
3. `Phase Plan` - 12 edges
4. `compilerOptions` - 9 edges
5. `scripts` - 7 edges
6. `scripts` - 7 edges
7. `scripts` - 7 edges
8. `scripts` - 7 edges
9. `getEnv()` - 7 edges
10. `getRedisConnectionOptions()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `getRedisConnectionOptions()` --calls--> `getEnv()`  [EXTRACTED]
  apps/worker/src/connection.ts → packages/shared/src/env.ts
- `main()` --calls--> `getEnv()`  [EXTRACTED]
  apps/worker/src/index.ts → packages/shared/src/env.ts
- `main()` --calls--> `getRedisConnectionOptions()`  [EXTRACTED]
  apps/worker/src/index.ts → apps/worker/src/connection.ts
- `createHeartbeatQueue()` --calls--> `getRedisConnectionOptions()`  [EXTRACTED]
  apps/worker/src/queues/heartbeat.queue.ts → apps/worker/src/connection.ts
- `main()` --calls--> `processHeartbeat()`  [EXTRACTED]
  apps/worker/src/index.ts → apps/worker/src/jobs/heartbeat.job.ts

## Import Cycles
- None detected.

## Communities (42 total, 11 thin omitted)

### Community 0 - "GitFlow and Conventions"
Cohesion: 0.25
Nodes (7): Branching Model, Commit Format (Conventional Commits), Commit Rules for AI Agents, GitFlow and Conventions, PR Body:, PR Title:, Pull Request Standard

### Community 1 - "worker/package.json"
Cohesion: 0.07
Nodes (29): dependencies, @app/database, @app/shared, bullmq, pino, devDependencies, tsx, @types/node (+21 more)

### Community 2 - "api/package.json"
Cohesion: 0.08
Nodes (24): dependencies, @app/database, @app/shared, cors, express, pino, pino-http, @app/database (+16 more)

### Community 3 - "database/package.json"
Cohesion: 0.08
Nodes (23): dependencies, @prisma/client, devDependencies, prisma, @types/node, typescript, @types/node, typescript (+15 more)

### Community 4 - "server.ts"
Cohesion: 0.13
Nodes (14): createApp(), logger, options, healthRouter, startedAt, app, env, ConversationStatus (+6 more)

### Community 5 - "dependencies"
Cohesion: 0.08
Nodes (23): dependencies, @app/shared, @clerk/nextjs, lucide-react, next, react, react-dom, @app/shared (+15 more)

### Community 6 - "worker/src/index.ts"
Cohesion: 0.21
Nodes (12): getRedisConnectionOptions(), logger, main(), HeartbeatResult, processHeartbeat(), createHeartbeatQueue(), HeartbeatJobData, Env (+4 more)

### Community 7 - "Phase Plan"
Cohesion: 0.06
Nodes (28): AI Agent Guidelines, Do's, Don'ts, Core Entities, ⚠️ Critical Rule: Multi-Tenancy Isolation, Database Schema, Overview, Workflows (+20 more)

### Community 8 - "compilerOptions"
Cohesion: 0.10
Nodes (19): ES2022, compilerOptions, declaration, declarationMap, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules (+11 more)

### Community 9 - "devDependencies"
Cohesion: 0.11
Nodes (19): devDependencies, pino-pretty, supertest, tsx, @types/cors, @types/express, @types/node, @types/supertest (+11 more)

### Community 10 - "scripts"
Cohesion: 0.11
Nodes (18): engines, node, name, private, scripts, build, db:generate, db:push (+10 more)

### Community 11 - "shared/package.json"
Cohesion: 0.11
Nodes (18): dependencies, zod, devDependencies, typescript, vitest, typescript, vitest, main (+10 more)

### Community 12 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, incremental, jsx, module, moduleResolution, noEmit, paths (+9 more)

### Community 13 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, autoprefixer, postcss, tailwindcss, @types/node, @types/react, @types/react-dom, typescript (+7 more)

### Community 14 - "database/tsconfig.json"
Cohesion: 0.14
Nodes (13): compilerOptions, noEmit, outDir, rootDir, types, exclude, extends, include (+5 more)

### Community 16 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, module, moduleResolution, outDir, rootDir, extends, include, src (+1 more)

### Community 17 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, module, moduleResolution, outDir, rootDir, extends, include, src (+1 more)

### Community 18 - "shared/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src, ../../tsconfig.base.json

### Community 19 - ".prettierrc.json"
Cohesion: 0.33
Nodes (5): printWidth, semi, singleQuote, tabWidth, trailingComma

### Community 39 - "devDependencies"
Cohesion: 0.15
Nodes (13): dotenv-cli, eslint, @eslint/js, devDependencies, dotenv-cli, eslint, @eslint/js, prettier (+5 more)

### Community 40 - "Folder Structure and Architecture"
Cohesion: 0.29
Nodes (6): Applications (`apps/`), Folder Structure and Architecture, High-Level Architecture Principles, Infrastructure (`infrastructure/`), Monorepo Layout, Packages (`packages/`)

### Community 41 - "Infrastructure and CI/CD"
Cohesion: 0.29
Nodes (6): CI/CD Pipeline (To Be Implemented), Commands, Environment Variables, Infrastructure and CI/CD, Infrastructure Setup, Services

## Knowledge Gaps
- **241 isolated node(s):** `semi`, `singleQuote`, `trailingComma`, `printWidth`, `tabWidth` (+236 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `api/package.json`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `semi`, `singleQuote`, `trailingComma` to the rest of the system?**
  _241 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `worker/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `api/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `database/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `server.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13157894736842105 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._