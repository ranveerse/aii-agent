# Artificially Intelligent Investor

Next.js (App Router) app: the ported frontend from `AI Investor Site.html`, plus a
small backend (Prisma + MySQL) behind `/api/reports` and `/api/mr-market`, and an
`/admin` page to post or delete them. See `CLAUDE.md` for the project map and
`docs/ANALYSIS_ENGINE.md` / `docs/MR_MARKET_INDEX_SPEC.md` for the analysis logic
those endpoints persist.

## Local setup

Requires Node 24+ and a local MySQL server.

```bash
brew services start mysql   # or however your MySQL server is run

npm install
cp .env.example .env.local   # fill in MYSQL_* and ADMIN_PASSWORD
npx prisma migrate dev       # applies prisma/schema.prisma
npm run dev                  # http://localhost:3000
```

## Admin (`/admin`)

Gated by `ADMIN_PASSWORD` (`.env.local`) — logging in sets an httpOnly cookie
(`src/lib/adminAuth.ts`, checked by `src/proxy.ts`, Next 16's renamed
`middleware.ts`). From there you can paste and submit a stock report or a
Mr. Market reading, see every one currently stored (expand a row for the full
JSON), and delete any of them. `GET /api/reports`, `GET /api/reports/[ticker]`,
and `GET /api/mr-market` (latest only) stay open with no login — that's the
public feed the live site reads. Everything else under those two paths
(POST, DELETE, and `GET /api/mr-market/history`) requires the admin login.

## Data flow

There's no live FMP/Anthropic integration yet — stock and Mr. Market analysis is
computed manually (per the two docs above) and posted through `/admin` (or `curl`),
which validates it (`src/lib/validation/`), stores it via Prisma
(`prisma/schema.prisma`), and the ported frontend (`src/app/page.tsx`) fetches it
back on load. The Mr. Market composite-score arithmetic itself lives in exactly one
place: `src/lib/mrMarket.ts`.

```bash
# example: submit a Mr. Market reading (percentiles computed by hand per the spec)
# — requires the admin cookie; easiest to do this through /admin instead.
curl -X POST http://localhost:3000/api/mr-market -H "Content-Type: application/json" -d '{
  "as_of": "2026-07-21",
  "components": [
    {"name":"VIX","raw":15.7,"percentile":33},
    {"name":"S&P vs 125-day MA","raw":0.1,"percentile":45},
    {"name":"CAPE","raw":41.8,"percentile":96},
    {"name":"Equity Risk Premium","raw":-1.5,"percentile":10},
    {"name":"AAII Bull-Bear Spread","raw":-0.9,"percentile":35}
  ]}'
```

`POST /api/reports` takes the full JSON object described in `docs/ANALYSIS_ENGINE.md`'s
Phase 3 output, plus a `company_name` field (the engine has no field for that).

## A env-loading gotcha worth knowing

Next.js's built-in `.env` loader expands `$NAME` tokens inside values (so vars can
reference each other). If a secret contains a literal `$` followed by word
characters, Next silently replaces it with an empty string at runtime — even
though the Prisma CLI (a separate, non-expanding loader) reads the same file fine.
`src/lib/rawEnv.ts` works around this by parsing `.env`/`.env.local` directly
instead of trusting `process.env` for anything that might contain `$`
(`src/lib/prisma.ts` and `src/lib/adminAuth.ts` both use it).
