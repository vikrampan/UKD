# UKD Party Operations Platform

Next.js + PostgreSQL rebuild of the UKD portal, following the Party Operations
& Governance architecture.

## Status

**V1a — the spine.** Built and typechecking; not yet connected to a database.

| Piece | State |
|---|---|
| Data model (identity / org / work / audit) | done |
| RBAC resolver — Role × Department × Geography × Sensitivity | done |
| Sessions, password policy, TOTP MFA | done |
| Append-only audit log (DB-enforced) | done |
| Task lifecycle + cascade | done |
| HTTP routes and UI | not started |
| Everything else in the doc | not started |

## Getting a database

Nothing runs until `DATABASE_URL` points at a real PostgreSQL. Neon or
Supabase both work; the free tiers are fine for development.

```bash
cp .env.example .env          # then paste your connection string
npx prisma migrate deploy     # creates schemas, tables, audit triggers
npm run db:seed               # org tree + bootstrap admin
npm run dev
```

Seed credentials come from `SEED_ADMIN_PHONE` / `SEED_ADMIN_PASSWORD`,
defaulting to `9999999999` / `ChangeMeNow123`. Change them before any
deployment that is reachable from the internet.

## Architecture notes

**One database, schema per domain.** The doc suggested separate databases per
domain; at UKD's scale that would cost distributed transactions and an ops
burden a small team can't carry, for isolation that Postgres schemas plus row
scoping already provide. Split later only if a domain genuinely outgrows it.

**Access control is server-side, always.** The old prototype filtered nav
items by role, which is not access control — the rows were already in the
browser bundle. Here, `scope()` in `src/lib/rbac.ts` turns an actor into a
Prisma `where` fragment, and every read of scoped data goes through it. It
fails closed: an actor with no live grants gets a filter matching nothing.

**Geography is a materialised path.** `OrgUnit.path` looks like
`<party>.<state>.<region>.<district>.`; "everything at or below unit X" is a
prefix match on an indexed column rather than a recursive walk.

**Audit is append-only in the database.** Triggers reject UPDATE and DELETE on
`audit."AuditLog"` whatever role is connected.

## Layout

```
prisma/schema.prisma     data model
prisma/migrations/       initial DDL + audit hardening
prisma/seed.ts           org tree (3 regions, 13 districts) + admin
src/lib/rbac.ts          the permission resolver — read this first
src/lib/auth.ts          passwords, sessions, TOTP
src/lib/session.ts       cookie handling, requireActor guard
src/lib/org.ts           tree helpers
src/lib/audit.ts         append-only writer
src/server/tasks.ts      reference module: scope + transitions + audit
```
