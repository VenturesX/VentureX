# Venture Directors

Orlando-first **event and group transportation operations** platform. It is not a booking site and not a rideshare clone. The product directs the path of travel for DMC, conference, airport, hotel, and VIP movements — with a shared real-time operational picture across Admin, Dispatch, Meet & Greet, Driver, and Client portals.

**Vision:** complex event transport should feel controlled, visible, and simple.

This repository ships the first vertical slice:

**Airport arrival meet-and-greet → curb queue → dispatch assignment → driver status sequence → live client view.**

## Open in Cursor (founder path)

1. Open this repo in Cursor from [Codebase](https://cursor.com/codebase/venturex/tmp-948d703211f0ca7d).
2. Ask the agent to walk the demo, or use **Preview** if a cloud agent already has the app running.
3. That preview is on the agent desktop only — **it is not a phone URL**.

For a link you can open on a phone, deploy to Vercel (below). Demo logins stay the same.

## Founder: get a preview URL (phone)

You cannot use the local `npm` commands on a phone. Host it on **Vercel + a free Postgres**.

SQLite (`file:./dev.db`) is **local only**. Vercel’s filesystem is ephemeral, so a hosted preview **requires Postgres** (Neon or Supabase free tier).

### 1. Create a free Postgres

- [Neon](https://neon.tech) → New project → copy the **direct / non-pooled** connection string, or
- [Supabase](https://supabase.com) → New project → Project Settings → Database → URI  

It must start with `postgresql://` and include `?sslmode=require`.

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New…** → **Project**.
2. Import Origin repo **`venturex/tmp-948d703211f0ca7d`**.  
   If Origin is not in the Git list: **Import Third-Party Git Repository** and use  
   `https://origin.cursor.com/git/venturex/tmp-948d703211f0ca7d`.
3. Framework: **Next.js** (auto).
4. Paste these **Environment Variables** (Production + Preview):

| Name | Value |
| --- | --- |
| `DATABASE_URL` | Your Neon/Supabase `postgresql://…?sslmode=require` URI |
| `AUTH_SECRET` | Any long random string (e.g. `venture-directors-preview-2026`) |
| `NEXT_PUBLIC_APP_NAME` | `Venture Directors` |
| `PROVIDER_MODE` | `mock` |

5. Deploy. First build runs `prisma db push` and **re-seeds the demo** (Whitaker walkthrough ready).
6. Open the `*.vercel.app` URL on your phone.

No other env vars are required. Do **not** set `DATABASE_URL` to `file:./dev.db` on Vercel.

## Stack choice

| Layer | Choice | Why |
| --- | --- | --- |
| App | Next.js 16 (App Router) + TypeScript | Web/PWA first, role-based routes, one deployable |
| UI | Tailwind v4 + shadcn/ui | Fast, consistent field + ops chrome |
| System of record | Prisma + SQLite locally (`DATABASE_URL` can be PostgreSQL in production) | Relational spine, easy founder demo, no Docker required |
| Auth | Signed HTTP-only JWT cookie (jose) + bcrypt | Server-authorized roles, no client-trusted RBAC |
| Realtime | Server-Sent Events + 12s snapshot poll | Shared truth without Redis for beta |
| Maps / SMS / flights | Provider interfaces, mock implementations | Swap later without rewriting ops |

Production SoR is intended to be **PostgreSQL**. Point `DATABASE_URL` at Postgres, change the Prisma `provider`, and run migrations. The schema is relational and pagination-ready for ~30k guests/event.

## Run locally

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```

Dev server: [http://127.0.0.1:43127](http://127.0.0.1:43127)

`npm run dev` also runs `prisma/ensure.ts`, which seeds an empty database automatically.

### Environment

See `.env.example`. Local uses SQLite (`DATABASE_URL=file:./dev.db`). Vercel preview must use Postgres — see **Founder: get a preview URL** above.

## Seed accounts

Password for every seeded user: `VentureOps!26`

| Role | Email | Portal |
| --- | --- | --- |
| Admin | `admin@venture.direct` | `/admin` (can open every portal) |
| Dispatcher | `dispatch@venture.direct` | `/dispatch` |
| Meet & Greet | `greeter@venture.direct` | `/meet-greet` |
| Driver (Marcus Hale, V-101) | `driver1@venture.direct` | `/driver` |
| Client (Horizon DMC) | `client@venture.direct` | `/client` |

Other drivers: `driver2@`, `driver3@`, `driver4@venture.direct`.

Seeded event: **IAAPA Expo 2026 — Hosted Buyer Arrivals** (`IAAPA-MCO-26`)  
Client: **Horizon DMC Orlando**  
Movement: MCO Terminal C Arrivals → Hyatt Regency Orlando  
Queue zone: circular curb geofence, **160m**, editable in Admin.

Walkthrough guest: **James Whitaker**, party `WHT-04`, confirmation `IAAPA-WHT-04`, flight `AA 1823`, VIP.

Two guests start already queued (Rhodes, Okoye) so Dispatch is not an empty board on first open.

## Acceptance click-through

1. Sign in as Meet & Greet. Search `Whitaker`.
2. Mark **Found**, **Check in**, then **Place in queue** (party toggle on).
3. Sign out, sign in as Dispatch. Confirm queue count, longest/avg wait, VIP count, and available vehicles.
4. Select the Whitaker party, assign **V-101**.
5. Sign in as Driver. Open the maps link. Advance **En Route → Arrived → Loading → Departed → Complete**.
6. Sign in as Client. The same statuses appear read-only.
7. Dispatch / Admin show timestamps and an audit log for assignment and any status correction (reason required).

## Architecture

```
Event → Movement → Guest / Queue → Assignment → Vehicle / Driver → Status History
```

- **Portals are separate routes**, authorized in middleware and re-checked in API handlers.
- Mutations go through `src/lib/ops/engine.ts` (status machine + audit + SSE publish).
- Overrides and reassignments require a **reason** and write `AuditLog` + `StatusHistory`.
- Guest search is paginated and indexed (`lastName`, `confirmationCode`, `partyCode`, `flightNumber`, `status`).
- Soft-delete (`deletedAt`) on staff, fleet, locations, guests, and similar records.

### Status models

- **Guest:** Expected → Arrived/Found → Checked In → Queued → Assigned → Boarded → Departed → Completed (+ No Show, Cancelled, Needs Assistance)
- **Vehicle/Driver:** Offline → Available → Assigned → En Route → Staged → Arrived → Loading → In Service → Completed → Available (+ Delayed, Breakdown, Removed)
- **Movement:** Planned → Open → Assigned → Active → Completed (+ Hold, Cancelled, Incident)
- **Priority:** Normal, VIP/Priority, Accessibility/Assistance

Driver UI labels **Departed** = In Service and **Complete** = Completed, then the vehicle returns to Available.

### Provider seams

- `src/lib/providers/maps.ts` — navigation URLs (Google / Apple). No live map tiles in beta.
- `src/lib/providers/sms.ts` — writes `MockOutboundMessage` rows.
- `src/lib/providers/flights.ts` — deterministic mock ETA/gate/status.

## Configurable ops (Beta 0 scaffold)

Admin can CRUD: clients, events, locations, circular geofences, routes, users, operators, vehicles, drivers, alert thresholds, timing presets.

- Default wait target **18 minutes** (inside the 15–20 minute product band), per event and overridable via alert config.
- VIP wait alert default **10 minutes**.
- Queue capacity alert default **25** on the seed event.
- CSV manifest import with validation, duplicate detection, and paged search. Sample: `data/sample-manifest.csv`.

## Assumptions (beta)

- **Staff-assisted check-in** is the primary path. Guests do not self-check-in in this slice.
- **Map provider is mocked.** Drivers get a real navigation URL; the board itself does not render a live map.
- **Partner operators** exist as records only. No partner load board, no multi-operator marketplace.
- **Wait target** defaults to 15–20 minutes and is configurable per event.
- **Realtime is single-process SSE.** Multiple Node instances would need a shared pub/sub (Redis, etc.).
- **SQLite is the local SoR.** Hosted preview/production uses Postgres via `DATABASE_URL`. Each Vercel build re-seeds the demo unless `SKIP_DEMO_SEED=1`.
- **Realtime SSE is single-process.** Vercel serverless may drop long SSE connections; portals also poll every 12s.
- Production SMS, FlightAware, Stripe, public quote/booking, polygon geofences, native apps, and AI dispatch are **out of scope**.

## PWA

Installable web app: `manifest.webmanifest`, theme color `#070b14`, service worker at `/sw.js` for shell/offline fallback. Field portals (M&G, driver) are built for phone and tablet.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server on port 43127 (ensures seed) |
| `npm run db:setup` | Generate, push, seed |
| `npm run db:seed` | Re-seed (destructive) |
| `npm run build` / `npm start` | Production build |
