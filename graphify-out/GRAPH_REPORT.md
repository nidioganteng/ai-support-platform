# Graph Report - ai-support-platform  (2026-08-02)

## Corpus Check
- 69 files · ~10,207 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 483 nodes · 532 edges · 40 communities (29 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b453785b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- docs/README.md
- worker/package.json
- dependencies
- database/package.json
- app.ts
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
- dependencies
- middleware.ts
- dashboard/layout.tsx
- global.d.ts
- knowledge-base/page.tsx
- devDependencies

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `scripts` - 14 edges
3. `getEnv()` - 12 edges
4. `Phase Plan` - 12 edges
5. `compilerOptions` - 10 edges
6. `getRedisConnectionOptions()` - 10 edges
7. `scripts` - 7 edges
8. `scripts` - 7 edges
9. `scripts` - 7 edges
10. `main()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `getRedisConnectionOptions()` --calls--> `getEnv()`  [EXTRACTED]
  apps/api/src/connection.ts → packages/shared/src/env.ts
- `getRedisConnectionOptions()` --calls--> `getEnv()`  [EXTRACTED]
  apps/worker/src/connection.ts → packages/shared/src/env.ts
- `main()` --calls--> `getEnv()`  [EXTRACTED]
  apps/worker/src/index.ts → packages/shared/src/env.ts
- `embedAndUpsert()` --calls--> `getEnv()`  [EXTRACTED]
  apps/worker/src/jobs/pdf-processing.job.ts → packages/shared/src/env.ts
- `getPdfQueue()` --calls--> `getRedisConnectionOptions()`  [EXTRACTED]
  apps/api/src/routes/knowledge-sources.ts → apps/api/src/connection.ts

## Import Cycles
- None detected.

## Communities (40 total, 11 thin omitted)

### Community 0 - "docs/README.md"
Cohesion: 0.06
Nodes (29): AI Agent Guidelines, Do's, Don'ts, Core Entities, ⚠️ Critical Rule: Multi-Tenancy Isolation, Database Schema, Overview, Workflows (+21 more)

### Community 1 - "worker/package.json"
Cohesion: 0.10
Nodes (20): devDependencies, tsx, @types/node, typescript, vitest, tsx, @types/node, typescript (+12 more)

### Community 2 - "dependencies"
Cohesion: 0.06
Nodes (32): dependencies, @app/database, @app/shared, bullmq, @clerk/express, cors, express, multer (+24 more)

### Community 3 - "database/package.json"
Cohesion: 0.08
Nodes (23): dependencies, @prisma/client, devDependencies, prisma, @types/node, typescript, @types/node, typescript (+15 more)

### Community 4 - "app.ts"
Cohesion: 0.07
Nodes (28): createApp(), getRedisConnectionOptions(), logger, options, healthRouter, startedAt, getPdfQueue(), getWebsiteCrawlQueue() (+20 more)

### Community 5 - "dependencies"
Cohesion: 0.08
Nodes (23): dependencies, @app/shared, @clerk/nextjs, lucide-react, next, react, react-dom, @app/shared (+15 more)

### Community 6 - "worker/src/index.ts"
Cohesion: 0.13
Nodes (23): getRedisConnectionOptions(), logger, main(), HeartbeatResult, processHeartbeat(), chunkText(), embedAndUpsert(), PdfProcessingResult (+15 more)

### Community 7 - "Phase Plan"
Cohesion: 0.10
Nodes (18): Phase 0 — Planning & Foundation ✅, Phase 10 — Polish & Production ⬜, Phase 1 — Auth & Dashboard Shell ⬜, Phase 2 — Knowledge Base: PDF & Text Upload ⬜, Phase 3 — Website Crawling ⬜, Phase 4 — RAG Chat Core ⬜, Phase 5 — Embeddable Widget ⬜, Phase 6 — Human Handoff & Tickets ⬜ (+10 more)

### Community 8 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, declaration, declarationMap, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib (+11 more)

### Community 9 - "devDependencies"
Cohesion: 0.10
Nodes (21): devDependencies, pino-pretty, supertest, tsx, @types/cors, @types/express, @types/multer, @types/node (+13 more)

### Community 10 - "scripts"
Cohesion: 0.10
Nodes (19): engines, node, name, private, scripts, build, db:generate, db:migrate (+11 more)

### Community 11 - "shared/package.json"
Cohesion: 0.11
Nodes (18): dependencies, zod, devDependencies, typescript, vitest, typescript, vitest, main (+10 more)

### Community 12 - "compilerOptions"
Cohesion: 0.09
Nodes (21): compilerOptions, allowJs, incremental, jsx, lib, module, moduleResolution, noEmit (+13 more)

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

### Community 27 - "dependencies"
Cohesion: 0.09
Nodes (23): dependencies, @app/database, @app/shared, bullmq, jsdom, @mozilla/readability, openai, pdf-parse (+15 more)

### Community 39 - "devDependencies"
Cohesion: 0.13
Nodes (15): concurrently, dotenv-cli, eslint, @eslint/js, devDependencies, concurrently, dotenv-cli, eslint (+7 more)

## Knowledge Gaps
- **267 isolated node(s):** `semi`, `singleQuote`, `trailingComma`, `printWidth`, `tabWidth` (+262 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `worker/package.json`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `pdf-parse` connect `dependencies` to `worker/src/index.ts`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `processPdfJob()` connect `worker/src/index.ts` to `dependencies`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `semi`, `singleQuote`, `trailingComma` to the rest of the system?**
  _267 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `docs/README.md` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Should `worker/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._