# Venture Directors

Orlando-first **event and group transportation operations** platform. It is not a booking site and not a rideshare clone. The product directs the path of travel for DMC, conference, airport, hotel, and VIP movements — with a shared real-time operational picture across Admin, Dispatch, Meet & Greet, Driver, and Client portals.

**Vision:** complex event transport should feel controlled, visible, and simple.

This repository ships the first vertical slice:

**Airport arrival meet-and-greet → curb queue → dispatch assignment → driver status sequence → live client view.**

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

```
DATABASE_URL="file:./dev.db"
AUTH_SECRET="replace-with-a-long-random-string"
PROVIDER_MODE="mock"
```

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
- **SQLite is the local SoR.** Postgres is the intended production database.
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
