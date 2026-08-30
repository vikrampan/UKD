# Deploying

Two Vercel projects from this one repository: the public site at the root,
the platform in `platform/`.

## 1. Platform (Next.js + Postgres)

New Vercel project → import this repo → **set Root Directory to `platform`**.
Everything else is detected.

Environment variables (Production, Preview, Development):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon **pooled** string (host contains `-pooler`) |
| `DIRECT_URL` | Neon **direct** string (no `-pooler`) |
| `SESSION_SECRET` | `openssl rand -base64 32` |
| `PUBLIC_SITE_ORIGINS` | the public site's URL, e.g. `https://ukd.vercel.app` |

`PUBLIC_SITE_ORIGINS` is the CORS allowlist. Until it names the real site
origin, the site's grievance form will be blocked by the browser.

Migrations are already applied to the database. If you later point at a fresh
one, run `npx prisma migrate deploy` and `npm run db:seed` locally against it.

## 2. Public site (Vite + React)

The existing Vercel project. Add one variable:

| Variable | Value |
|---|---|
| `VITE_API_BASE` | the platform's URL, e.g. `https://ukd-platform.vercel.app` |

**Then redeploy.** Vite bakes environment variables in at build time, so an
existing deployment will not pick this up on its own.

## Order

Platform first — you need its URL for `VITE_API_BASE`, and it needs the site's
URL for `PUBLIC_SITE_ORIGINS`. Deploy the platform, set the site variable,
redeploy the site, then come back and fill in `PUBLIC_SITE_ORIGINS`.

## Checks after deploying

```
curl https://<platform>/api/public/stats        # real counts
curl https://<platform>/api/public/news         # published announcements
```

On the site: open the जन पोर्टल form, submit an issue, confirm you get a
`UKD-…` code back, then look it up under समस्या की स्थिति देखें.

## Before real users

- Rotate the database password (Neon → Roles → reset).
- Change the seeded admin's password — it is a known default.
- Confirm the leader designations in `LEADERS`; they are placeholders.
