---
kanban-plugin: basic
---

## Inbox
- [ ] Define role list for dijkdoorbraak (8 roles) and write 1–2 sentence role summaries #design #content
- [ ] Collect 20–30 inject ideas and group by category (water/infra/traffic/care/rumors/politics) #design #content
- [ ] Decide if sessions are round-based, time-based, or hybrid #design
- [ ] Decide retention policy (keep runs X days, export then purge) #security #product
- [ ] Pick admin auth method (local + TOTP vs OIDC) #security #backend

## Backlog
- [ ] [Repo] Add root README with local dev + Docker + ports + env overview #docs
- [ ] [Repo] Add CONTRIBUTING.md (branching, commit style, PR checklist) #docs
- [ ] [Repo] Add `.editorconfig` + Prettier config + format script at root #repo
- [ ] [Repo] Add ESLint config shared across workspace (or per app) #repo
- [ ] [Repo] Add Husky + lint-staged (format/lint on commit) #repo
- [ ] [Repo] Add Changesets (versioning for shared package) #repo

- [ ] [Infra] Add `compose.dev.yml` in repo root that includes web + server + db (+ redis) #infra
  - Acceptance: `docker compose up` boots everything and web talks to server
- [ ] [Infra] Add `compose.prod.yml` with healthchecks + restart policies #infra
- [ ] [Infra] Add Caddy config for HTTP + WebSocket upgrade routing #infra
- [ ] [Infra] Add `.env.example` for web/server/compose with safe defaults #infra #docs
- [ ] [Infra] Add DB backup script (pg_dump) with rotation (daily/weekly) #infra
- [ ] [Infra] Add restore script + runbook steps #infra #docs
- [ ] [Infra] Add log location + log rotation plan #infra
- [ ] [Infra] Add minimal monitoring (Uptime Kuma or simple health probe) #infra

- [ ] [CI] Add GitHub Actions: install, lint, typecheck, build (web/server/shared) #ci
- [ ] [CI] Add CI step for Prisma schema format + migrate dry-run #ci
- [ ] [CI] Add Docker build workflow (optional) #ci #infra
- [ ] [CI] Add secret scanning (gitleaks) #ci #security

- [ ] [Shared] Add `@dijk/shared` zod schemas for: RoomCode, Nickname, RoleId, InjectId, SessionId #shared
- [ ] [Shared] Add shared socket event types (string literal unions) #shared
- [ ] [Shared] Add shared “safe text” helpers (max lengths, trimming rules) #shared #security
- [ ] [Shared] Add shared enums for score tracks (Safety/Continuity/Trust) #shared

- [ ] [DB] Expand Prisma models: Scenario, ScenarioVersion, Role, InjectTemplate, Session, Player, Assignment, Response, EventLog, SessionState #backend #db
- [ ] [DB] Add indices for hot paths (roomCode, sessionId, createdAt) #backend #db
- [ ] [DB] Add soft-delete fields where needed (deletedAt) #backend #db
- [ ] [DB] Add migration for event log table with JSON payload #backend #db

- [ ] [Backend] Add config module (dotenv validation) and fail-fast on missing env #backend
- [ ] [Backend] Add global validation pipe (zod or class-validator) #backend
- [ ] [Backend] Add structured logging (pino) + request IDs #backend #infra
- [ ] [Backend] Add rate limiting middleware for join + auth endpoints #backend #security
- [ ] [Backend] Add CORS policy (allow web origin only) #backend #security

- [ ] [Auth] Implement admin auth (email+password) with bcrypt + secure sessions or JWT #backend #security
- [ ] [Auth] Add admin roles: OWNER, FACILITATOR, VIEWER #backend #security
- [ ] [Auth] Add TOTP 2FA for admin accounts (optional but strong) #backend #security
- [ ] [Auth] Add “create first admin” bootstrap command (CLI) #backend #security
- [ ] [Auth] Add password reset flow (token + expiry) #backend #security
- [ ] [Auth] Add audit logs for admin auth actions (login, 2FA enable, resets) #backend #security

- [ ] [Sessions] Create REST endpoint: `POST /sessions` (admin) to start a run from scenario version #backend
- [ ] [Sessions] Generate roomCode (short) + internal sessionId (cuid) #backend
- [ ] [Sessions] Add endpoint: `GET /sessions/:id` (admin view) #backend
- [ ] [Sessions] Add endpoint: `POST /sessions/:id/end` (locks run, generates summary) #backend
- [ ] [Sessions] Add endpoint: `POST /sessions/:id/purge` (delete player names + tokens) #backend #security
- [ ] [Sessions] Add endpoint: `GET /sessions/:id/export` (CSV/JSON) #backend #docs

- [ ] [Realtime] Add Socket.IO gateway in NestJS with namespaces/rooms #backend
- [ ] [Realtime] Define socket events (server-authored):
  - `room:joined`, `room:error`, `player:list`, `role:assigned`, `inject:sent`, `inject:ended`, `state:update`, `session:ended`
  #backend #shared
- [ ] [Realtime] Define socket events (client-submitted):
  - `player:join`, `player:reconnect`, `player:submitResponse`, `admin:assignRole`, `admin:sendInject`, `admin:overrideState`, `admin:pause`, `admin:resume`
  #backend #shared
- [ ] [Realtime] Implement join token issuance (signed, short TTL, session-bound) #backend #security
- [ ] [Realtime] Implement reconnect using token + playerId (no duplicates) #backend
- [ ] [Realtime] Implement “lock room” toggle (no new joins after start) #backend
- [ ] [Realtime] Implement presence tracking (connected/disconnected timestamps) #backend

- [ ] [Game] Implement session phases: LOBBY → BRIEFING → RUNNING → ENDED #backend
- [ ] [Game] Implement round timer (optional) with start/pause/resume #backend
- [ ] [Game] Implement inject queue per session (scheduled + manual) #backend
- [ ] [Game] Implement inject instance creation when sent (stores final text) #backend
- [ ] [Game] Implement response deadline handling (late/locked) #backend
- [ ] [Game] Implement event log entries for every state change #backend #db

- [ ] [State] Implement SessionState model:
  - waterLevel (0–10), roadClosures[], powerStatus, sheltersOpen, resourcePool, flags{}
  #backend #db
- [ ] [State] Implement “effects” engine (inject applies diffs to state) #backend
- [ ] [State] Implement admin override with reason note (logged) #backend
- [ ] [State] Implement read-only state feed to players (role-filtered later) #backend

- [ ] [Scoring] Implement score tracks (Safety/Continuity/Trust) on SessionState #backend
- [ ] [Scoring] Add simple scoring rules (inject options map to +/- deltas) #backend
- [ ] [Scoring] Add end-of-run score breakdown + timeline highlights #backend

- [ ] [Scenario] Implement Scenario + Version model + clone-to-new-version #backend #db
- [ ] [Scenario] Add inject template variables system:
  - scenario defaults + session overrides
  #backend
- [ ] [Scenario] Add basic trigger system:
  - by round/time, by state flag, by response option
  #backend
- [ ] [Scenario] Add attachments support (maps/role cards) stored on disk or S3 #backend #infra

- [ ] [Web-Player] Create `/join/[roomCode]` page with nickname input + join button #frontend
- [ ] [Web-Player] Add QR-friendly join page styling (mobile-first) #frontend
- [ ] [Web-Player] Implement socket connection + join handshake #frontend
- [ ] [Web-Player] Add reconnect handling (refresh resumes) #frontend
- [ ] [Web-Player] Build player lobby screen (waiting, assigned role pending) #frontend
- [ ] [Web-Player] Build role screen (role card + private notes) #frontend
- [ ] [Web-Player] Build inject feed screen (current inject + timer + history) #frontend
- [ ] [Web-Player] Build response form renderer (MCQ + short text) #frontend
- [ ] [Web-Player] Add “submitted/locked” states + error handling #frontend
- [ ] [Web-Player] Add end screen (score + personal decisions summary) #frontend

- [ ] [Web-Admin] Create admin login pages + session handling #frontend #security
- [ ] [Web-Admin] Build admin dashboard home (scenarios list + recent sessions) #frontend
- [ ] [Web-Admin] Build session create wizard:
  - pick scenario version
  - fill variables
  - set difficulty toggles
  - generate QR + join link
  #frontend
- [ ] [Web-Admin] Build live session panel:
  - players list + status
  - role assignment UI
  - lock room
  - start/pause/end
  #frontend
- [ ] [Web-Admin] Add QR code generator component (join URL) #frontend
- [ ] [Web-Admin] Build inject control:
  - queue list
  - edit-before-send
  - send to all or targeted roles
  - ad-hoc inject composer
  #frontend
- [ ] [Web-Admin] Build response monitor:
  - per inject: who answered, selections, text
  - filter by role
  #frontend
- [ ] [Web-Admin] Build state panel:
  - water level slider
  - toggles: bridge closed, power out
  - resource counts
  #frontend
- [ ] [Web-Admin] Build export buttons (CSV/JSON) + download UX #frontend
- [ ] [Web-Admin] Add audit log viewer for the session #frontend

- [ ] [Editor] Build scenario editor shell (tabs: Roles / Injects / Variables / Triggers) #frontend
- [ ] [Editor] Role editor:
  - create/edit role card
  - ordering
  - permissions flags
  #frontend
- [ ] [Editor] Inject template editor:
  - text + variables
  - targeting
  - response form builder
  - effects builder
  #frontend
- [ ] [Editor] Variables editor (defaults + descriptions + constraints) #frontend
- [ ] [Editor] Trigger builder (simple if/then UI) #frontend
- [ ] [Editor] Versioning actions:
  - clone version
  - mark active
  - view history
  #frontend

- [ ] [Security] Enforce output escaping for player free-text everywhere in UI #security #frontend
- [ ] [Security] Add CSP headers via Caddy (script-src self etc.) #security #infra
- [ ] [Security] Add join rate limits (IP + roomCode) #security #backend
- [ ] [Security] Add payload size limits for socket events + HTTP body #security #backend
- [ ] [Security] Add admin action confirmations for destructive ops (purge/end) #security #frontend
- [ ] [Security] Add data minimization: nickname only, no IP stored in DB #security #backend
- [ ] [Security] Add retention job (cron) to purge old sessions #security #backend #infra

- [ ] [QA] Add unit tests for:
  - roomCode generation uniqueness
  - token signing/verification
  - effects application
  - scoring deltas
  #tests #backend
- [ ] [QA] Add integration tests for socket flow:
  - join → assign role → send inject → submit response
  #tests #backend
- [ ] [QA] Add Playwright e2e:
  - admin creates session
  - player joins via URL
  - inject shows up
  - response submitted
  #tests #frontend
- [ ] [QA] Add load smoke test (8 players + admin) with scripted sockets #tests
- [ ] [QA] Add accessibility pass (mobile tap targets, contrast, keyboard) #frontend #qa

- [ ] [Docs] Add “Run a session” facilitator checklist (before/during/after) #docs
- [ ] [Docs] Add “Create a scenario” guide for admins #docs
- [ ] [Docs] Add “Debrief template” (what happened / why / improvements) #docs
- [ ] [Docs] Add API + socket event reference (for dev) #docs #backend

## Ready
- [ ] [M1] Add root compose.dev that starts web+server+db and confirms health endpoints #milestone
- [ ] [M1] Implement room creation endpoint + roomCode generator + QR join URL format #backend #milestone
- [ ] [M1] Implement socket gateway join + presence + reconnect tokens #backend #milestone
- [ ] [M1] Build player join page + lobby screen + socket handshake #frontend #milestone
- [ ] [M1] Build admin live session panel: player list + assign roles + lock room #frontend #milestone
- [ ] [M1] Implement “send inject” (admin) + “view inject” (player) + “submit response” #milestone
- [ ] [M1] Persist inject instances + responses + event log in DB #backend #milestone
- [ ] [M1] Export session log as JSON (one click) #backend #milestone

## Doing

## Review
- [ ] [Review] Security pass on join/auth/token handling (threat checklist) #security
- [ ] [Review] Run full flow on mobile (scan QR, join, respond, reconnect) #qa
- [ ] [Review] Verify WS routing behind proxy (upgrade headers) #infra

## Done
