# Database Schema

## Overview
Defined in `packages/database/prisma/schema.prisma`. Everything is scoped under `Organization` — this is the multi-tenancy boundary.

## Core Entities
- **Organization** — a client business. `plan`: FREE / PRO / ENTERPRISE.
- **User** — a person who can log in. Identity (email, password, sessions) lives in Clerk; this row just links `clerkUserId` to our data.
- **Membership** — join table: a User's `role` (OWNER / ADMIN / AGENT) within one Organization. A user can belong to multiple orgs.
- **KnowledgeSource** — one ingested source (PDF / TEXT / WEBSITE). `status`: PENDING → PROCESSING → READY | FAILED. The actual vectors live in Pinecone; this row tracks status/metadata only.
- **Conversation** — one end-customer chat thread. `status`: OPEN / PENDING_HUMAN / RESOLVED / CLOSED.
- **Message** — one message in a conversation. `sender`: CUSTOMER / AI / AGENT.

## ⚠️ Critical Rule: Multi-Tenancy Isolation
**Every query that touches KnowledgeSource, Conversation, or Message must filter by `organizationId`.**
There is no row-level security at the DB layer yet — tenant isolation is enforced entirely in application code. **A missing `where: { organizationId }` is a cross-tenant data leak, not just a bug.**

## Workflows
- **Migrations**: Phase 0 used `prisma db push` for speed. Switch to `prisma migrate dev` once there's real data worth preserving across schema changes (do this before or during Phase 1, not later).
- **Access**: The `api` and `worker` apps instantiate `PrismaClient` to interact with the database.
