# Project Goals
- Players join a session by scanning a QR code (no install).
- Admins create a session, assign roles, run the scenario live.
- Admins can tailor injects/prompts to the group (before and during play).
- Everything is logged for debrief + grading.
- Minimal personal data, secure by design.
---
## Tech stack (VPS-friendly, real-time)

### Frontend
- **Next.js (TypeScript)** — player + admin UI
- UI library: **shadcn/ui** (optional) + Tailwind
- Form + validation: **react-hook-form** + **zod**
### Backend
- **NestJS (TypeScript)** — REST API + auth + “game engine”
- Real-time: **Socket.IO** via NestJS WebSocket gateway
- Validation: **zod** (shared with frontend)
### Data
- **PostgreSQL** — scenarios, sessions, players, roles, injects, responses, event log
- ORM: **Prisma**
- Optional: **Redis** — timers/scheduling, rate limiting, reconnect state
### Hosting / Ops
- **Docker Compose**
- Reverse proxy + TLS: **Caddy** (simple HTTPS + WebSocket upgrade)
- Backups: pg_dump + encrypted offsite copy (or object storage)
---
## Core architecture
**Server is authoritative.** Clients never control state.

- **Web (Next.js)**
    - `/join/:code` (player join flow)
    - `/play` (player live screen)
    - `/admin` (dashboard + editor + game master)

- **API (NestJS REST)**    
    - Admin auth, scenario CRUD, session creation, exports
- **Realtime (NestJS + Socket.IO)**
    - join room, role assignment updates, inject broadcasts, decision submissions, timers, state updates
- **DB (Postgres)**
    - persistent storage + audit trail

---
## Data model (minimum that scales)

- `AdminUser`
- `Scenario` (versioned)
- `Role` (per scenario)
- `InjectTemplate` (text + variables + form definition)
- `Session` (scenario version + session settings + join code)
- `Player` (session-bound, minimal fields)
- `Assignment` (player ↔ role)
- `InjectInstance` (what was sent in this session, possibly edited)
- `Response` (player decisions)
- `EventLog` (every admin action + system event, timestamped)
- `SessionState` (water level, closures, resource counts, flags)    

---

## Roadmap (phases + deliverables)

### Phase 1 — Repo + foundations

**Deliverables**
- Monorepo: `apps/web`, `apps/server`, `packages/shared`, `infra/docker`
- Docker Compose with Postgres (+ Redis optional)
- Caddy local + prod configs
- Shared types package (`packages/shared`) with zod schemas

**Key decisions**
- Anonymous players, admin accounts only
- Minimal PII: player nickname only

---

### Phase 2 — Sessions + QR join (MVP core)

**Deliverables**
- Admin: create session → generates join code + QR
- Player: join by code/QR, pick nickname, get session token
- Live player list in admin panel
- Reconnect support (refresh doesn’t duplicate player)

**Security**
- Signed session tokens (short TTL) + session-bound
- Rate limits on join attempts

---

### Phase 3 — Role assignment + role views

**Deliverables**
- Admin: assign roles (drag/drop), lock roles
- Player: role card page (responsibilities + constraints)
- Targeted messaging per role (admins can send private injects)    

---

### Phase 4 — Inject engine + responses (playable game)

**Deliverables**
- Admin inject queue (preloaded + send-now)    
- Inject templates with variables (filled at session setup)
- Player response forms (MCQ + short text + resource request buttons)
- Live response dashboard (who answered, what they chose)
- Full event timeline (for debrief)

---

### Phase 5 — State + scoring (simple but useful)

**Deliverables**
- Session state panel (water level, road closures, power status, shelters)
- Inject effects update state (manual override always available)
- Score tracks: **Safety / Continuity / Trust** (optional)
- End screen: summary + score breakdown + key decisions    

---

### Phase 6 — Scenario editor (modularity)

**Deliverables**
- Scenario CRUD + versioning (“clone to new version”)
- Role editor (role cards, permissions)
- Inject template editor (variables, targeting, forms, effects)
- Basic branching rules:
    - time/round trigger
    - condition on state flags
    - condition on response option

This is where “tailor to the group” becomes smooth.

---

### Phase 7 — Exports + classroom workflow

**Deliverables**
- Export session report (CSV/JSON first)    
- Printable role cards + scenario brief (PDF later)
- Data retention controls (auto purge after X days or manual delete)

---

## Security plan (baseline)

- HTTPS only, HSTS via reverse proxy    
- Admin auth with strong password policy + optional TOTP 2FA
- Player flow: no accounts, session tokens only
- Server-side validation for every payload
- Output escaping for all player text (XSS prevention)
- DB not exposed publicly; least-privilege DB user
- Audit log for admin actions (edits, overrides, assignments)
- Regular encrypted backups

---

## Dev workflow

- Branching: `main` (stable) + `develop` (active)    
- CI (GitHub Actions/GitLab CI):
    - lint, typecheck, tests
    - build Docker images        
- Tests:
    - unit tests for rules/state transitions
    - basic e2e “join → assign → inject → respond”        

---

## VPS deployment outline

- Docker Compose: `web`, `server`, `db`, `redis`, `caddy`
- Caddy routes:
    - `yourdomain.tld` → Next.js        
    - `/api` and `/socket.io` → NestJS (WebSocket upgrade enabled)
        
- Backups:
    - nightly pg_dump + rotate + offsite copy

---

## Stretch features (nice later)

- Multi-team rooms (2–3 teams competing)
- Observer mode (teacher view only)
- Media pack per inject (map overlays, images)
- More advanced branching + “fog of war” info feeds    
- Analytics for grading (response timing, comms clarity rubric)