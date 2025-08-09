awesome—here’s a clean, Claude-ready starter plan you can paste in and iterate on. It’s web-first, Node/TypeScript, scrapes multiple sources into a common contract, runs on cron, starts with JSON then upgrades to a DB, and ends with a simple but solid PWA UI.

# Project plan (for Claude)

## Goal

Build a web app (web-first, mobile-friendly, PWA-capable) that aggregates live music/event “gigs” from multiple sites into a single directory with filtering by venue, location, and genre. Start lean: JSON storage; later migrate to a database.

---

## Tech choices (initial)

- **Runtime:** Node 20+, TypeScript
- **Scraping:** Playwright (robust) + Cheerio (HTML parsing). Consider `crawlee` later for queueing/anti-bot niceties.
- **Scheduling:** cron via `node-cron` (or system cron in prod). Later: queue with BullMQ + Redis if needed.
- **Storage v1:** local JSON files under `/data` (one per source + a merged catalog).
- **Storage v2:** PostgreSQL + Prisma (migration path planned).
- **Web app:** Next.js (SSR for SEO), Tailwind CSS. PWA with `next-pwa`.
- **Search/filter:** client + API filtering to start; later add server-side indexing (Postgres full-text / Meilisearch).

---

## Repo structure

```
gig-aggregator/
  apps/
    web/                   # Next.js app (UI, SSR, PWA)
  packages/
    scraper/               # shared scraping utils
    contracts/             # TypeScript types & validators (zod)
    dedupe/                # de-dup logic
  services/
    ingestor/              # cron jobs: scrape->normalize->merge
  data/
    sources/               # raw per-source json
    catalog.json           # merged, deduped master
  .env.example
  package.json
  turbo.json               # optional monorepo (Turborepo)
  README.md
```

---

## Common data contract

Use a strict schema so every scraper normalizes to the same shape.

```ts
// packages/contracts/src/gig.ts
import { z } from "zod";

export const GigSchema = z.object({
  id: z.string(), // stable ID in our catalog
  source: z.string(), // e.g. "songkick", "venue-xyz"
  sourceId: z.string().optional(), // upstream unique id if available
  title: z.string(),
  artists: z.array(z.string()).default([]),
  genre: z.array(z.string()).default([]),
  dateStart: z.string(), // ISO datetime
  dateEnd: z.string().optional(), // ISO if available
  timezone: z.string().optional(), // e.g. "Europe/Amsterdam"
  venue: z.object({
    name: z.string(),
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }),
  price: z
    .object({
      min: z.number().nullable(),
      max: z.number().nullable(),
      currency: z.string().nullable(), // "EUR", "GBP"
    })
    .optional(),
  ageRestriction: z.string().optional(),
  status: z.enum(["scheduled", "cancelled", "postponed"]).default("scheduled"),
  ticketsUrl: z.string().url().optional(),
  eventUrl: z.string().url().optional(),
  images: z.array(z.string().url()).default([]),
  updatedAt: z.string(), // ISO when we last saw it
  hash: z.string(), // content hash for change detection
});

export type Gig = z.infer<typeof GigSchema>;
```

**ID strategy:** `id = slug(venue.name + title + dateStart + city)`; keep `sourceId` for syncing.

**Hash strategy:** stable JSON of important fields → SHA256. If hash changes, mark as updated.

---

## Scrapers (per source)

- Each scraper exports:

  - `fetchRaw(): Promise<unknown[]>`
  - `normalize(raw): Gig[]` (must validate with `GigSchema`)
  - `upstreamMeta = { name, rateLimitPerMin, defaultSchedule }`

- Save raw to `data/sources/<source>.raw.json` (for debugging).
- Save normalized to `data/sources/<source>.normalized.json`.

**Anti-fragile tips (for Claude to implement):**

- Use Playwright with stealth selectors; retry with backoff; respect `robots.txt` and site ToS.
- Rate-limit requests; randomize UA; cache pages during a run.
- For sites with APIs/feeds (iCal/JSON/RSS), prefer those over HTML.

---

## Deduping & merge

- Primary key: `id`.
- Also compute a **fuzzy key** using normalized `{city, dateStart ± 1h, title simplified, venue simplified}`; use string similarity (e.g., Jaro-Winkler) to catch near-duplicates.
- Merge rule: prefer fields from sources with higher **trust score** (e.g., official venue > aggregator), else keep first-seen.
- Produce `data/catalog.json` with:

  - `gigs[]`
  - `sourceStats` (counts, lastRun, new/updated flags)

---

## Change detection & “new listings”

- On each run per source:

  - Load previous normalized file (if exists).
  - Compare by `id` & `hash`.
  - Mark gigs as `new: true` if not seen before; `updated: true` if hash differs.
  - Keep `firstSeenAt` and `lastSeenAt`.

---

## Scheduler (cron)

- Use `node-cron` initially inside `services/ingestor`.
- Default: run each source every 2–4 hours; stagger by minutes to avoid spikes.
- Example:

  - `0 */3 * * *` → run all sources every 3 hours.
  - Or per-source schedules from `upstreamMeta.defaultSchedule`.

CLI tasks:

```
pnpm ingest:all        # run all sources once
pnpm ingest:source foo # run a single source
pnpm merge             # merge + dedupe all normalized -> catalog.json
pnpm validate          # schema check for outputs
```

---

## API (simple, file-backed first)

Implement a small Next.js route (or a Node server) that serves the catalog and supports filters.

Routes:

- `GET /api/gigs?city=...&genre=...&dateFrom=...&dateTo=...&venue=...&q=...`
- `GET /api/gigs/:id`
- `GET /api/meta` (counts, last updated)

Filtering logic:

- Case-insensitive includes for text.
- Date range filter in UTC.
- `q` searches in `title`, `artists[]`, `venue.name`.

Later (DB phase), push filtering to SQL and index text fields.

---

## Web app (Next.js + PWA)

- Pages:

  - `/` – search & filters, paginated results
  - `/gig/[id]` – details, links out (tickets, source)

- Components:

  - Filter panel (city, date range, genre, venue)
  - Result list (virtualized for perf if needed)
  - Map toggle (later)

- PWA:

  - Add `next-pwa`, `manifest.json`, icons, offline shell for listing page.
  - Cache API responses for short TTL (e.g., 10–15 min).

**UX basics to hit first:**

- Obvious filters with chips/badges.
- Sticky “Filters” on mobile; keyboard-friendly search.
- Empty state, loading skeletons, and error toasts.
- Sort by date asc (default), then proximity (later).

---

## Migration path to DB (when ready)

- Add Postgres + Prisma models for `Gig`, `Venue`, `Artist`, `Source`.
- Backfill from `data/catalog.json`.
- Start writing both to JSON and DB for one sprint; then flip reads to DB.
- Add indexes: `(dateStart)`, `(city, dateStart)`, GIN on text fields for search.

---

## Quality, logging, and ops

- Validation: run zod validation in CI for sample snapshots from each source.
- Logging: pino logs with source, duration, counts of new/updated.
- Metrics: simple CSV/JSON report per run; later Prometheus/Grafana.
- Legal/ethics: respect robots.txt/ToS; implement opt-out list; throttle aggressively.
- Secrets: `.env` for API keys; never commit.
- CI: GitHub Actions for lint, typecheck, unit tests, and a nightly ingest dry-run.

---

## Milestones (two-week sprint 0)

1. **Day 1–2**

   - Bootstrap monorepo, packages, TypeScript, linting, Tailwind, Next.js.
   - Implement `GigSchema`, shared utils, basic `ingestor` skeleton.

2. **Day 3–5**

   - Build 2–3 scrapers (mix of HTML + feed).
   - Write normalized outputs, change detection, and merge to `catalog.json`.

3. **Day 6–8**

   - Minimal API: `/api/gigs` with filters.
   - Next.js UI with filters + list + details page.

4. **Day 9–10**

   - Add cron, logging, and a simple dashboard page `/admin` showing last run, new/updated counts.
   - PWA manifest + offline basics.

---

## Tasks for you (Claude) to start now

- [ ] Create repo structure above with `pnpm` workspaces (or npm if preferred).
- [ ] Implement `packages/contracts` with `GigSchema` and unit tests.
- [ ] Scaffold `services/ingestor` with a plugin interface for scrapers.
- [ ] Add one demo scraper against a simple public events feed (RSS/iCal/JSON) and one HTML page using Playwright.
- [ ] Implement merge + dedupe + hash logic and write `data/catalog.json`.
- [ ] Expose `GET /api/gigs` in Next.js (file-backed).
- [ ] Build the initial UI: filters (city, date range, genre, venue), results, gig details page.
- [ ] Add `node-cron` to run ingest every 3 hours; logs to console + `data/run-logs/`.
- [ ] Add PWA manifest and service worker (via `next-pwa`).
- [ ] Document local dev (`README.md`) and `.env.example`.

---

## Nice-to-haves (later)

- Geosearch (distance from user), map view, favorites, email alerts for new gigs matching filters, Meilisearch, rate-limit & backoff manager, S3/Blob storage for snapshots.

---

If you want, I can turn this into a ready-to-run repo scaffold (scripts, package.json, and a sample scraper).
