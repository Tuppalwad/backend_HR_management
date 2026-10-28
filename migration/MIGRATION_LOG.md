# MongoDB → MySQL Migration Log

Living record of the migration from MongoDB/Mongoose to MySQL for the EMPsystem HRMS + Asset
Management backend. Updated as each phase happens — this is the source of truth for what's been
done, what was decided and why, and what's left.

---

## Status: Migration complete, and fully decommissioned from the codebase. `/api/*` is MySQL-backed (Phase 5), and every Mongo-backed connection, model, controller, and route has since been removed from the live application per explicit request — see "Post-cutover cleanup" below. MongoDB itself (the server and its data) was left untouched; only this project's code was cleaned up.

---

## Scope

15 existing Mongoose collections (HR core: users, admins, clients, images, projects, timesheets,
attendance, employee/admin sessions, leaves, FCM tokens, employee profiles, employee documents,
work locations) plus the Asset Management module (5 collections/tables) added this project.
Target: 24 relational tables on MySQL 8.0.

## Decisions locked in before any schema/code was written

| Decision | Choice | Why |
|---|---|---|
| ORM | Prisma 7 | Schema-first, typed client, matches how Mongoose schemas already define this codebase's models |
| Primary/foreign keys | Business keys (`empId`, `assetId`), not new generated IDs | These are already the real join keys everywhere in the existing code |
| Traceability | `legacy_mongo_id` column on every table during the transition | Lets us verify migrated rows against their Mongo source; dropped after cutover is confirmed stable |
| Cutover strategy | Big-bang with a maintenance window | Internal HR tool, request/response controllers, no high write-concurrency — dual-write's complexity isn't earned here |
| MySQL version | 8.0+ | Needed for window functions / CTEs when rewriting the aggregation-pipeline controllers (dashboard counts, attendance reports) |
| Charset/collation | `utf8mb4` / `utf8mb4_unicode_ci` | MySQL's plain `utf8` silently truncates full Unicode (emoji, some names) |
| Execution style | Checkpointed | Review after each phase before the next one starts, given the size of this change |

## Environment findings (recorded because they shaped the plan)

- **MongoDB is live with real data** at `mongodb://localhost:27017/EMSadmin1` — this is a real
  migration, not a rehearsal.
- **This repo had no git history before this migration.** Initialized one specifically so there'd
  be a rollback point, given the size of the change about to happen.
- **Docker Desktop works, but only from PowerShell** in this environment — its Bash/Git-Bash CLI
  can't reach the daemon's named pipe. All Docker commands for this migration go through
  PowerShell.
- The sandbox does not keep long-running containers alive across long idle gaps between sessions —
  the MySQL container was found stopped (exit 137) after a multi-hour gap once already. It restarts
  cleanly since the data volume persists; just don't assume it's still running without checking.
- **A MySQL container restart can break the app's DB connection in a way that looks like an app
  bug but isn't** (found while starting 4e testing): every query started failing with `pool
  timeout... RSA public key is not available client side`. Root cause: the app user authenticates
  with `caching_sha2_password` (MySQL 8's default), which needs either TLS or the server's RSA
  public key to complete a *full* handshake; that key exchange is normally cached, but a container
  restart clears the server-side cache and forces every fresh pool connection through a full
  handshake again, which the `mariadb` Node driver refuses unless explicitly allowed. Fixed by
  adding `?allowPublicKeyRetrieval=true` to `DATABASE_URL` in `.env` — safe here since the
  connection is local-only, never leaves the machine. Not an application bug, but will resurface
  after any future container restart if this flag is ever removed, so recording it here rather than
  in one sub-phase's notes.

## Phase 1 — Setup (complete)

1. **`.gitignore` hardened before the first commit.** `.env`, `private.key` (the RSA key that
   signs every JWT), and `config/firebase-admin.json` (a Firebase service account credential) were
   about to be committed — none of them were previously excluded. Added all three, plus
   `asset/uploads/` (user-uploaded binaries don't belong in source control), before staging
   anything.
2. **Git initialized, baseline commit created:** `89c3a1a` — "Baseline commit before MongoDB to
   MySQL migration". This is the rollback point for the whole migration.
3. **MySQL 8.0 provisioned via Docker**, container name `empsystem-mysql`:
   - Database: `empsystem`
   - App user: `empsystem_app` (scoped to that database, not root)
   - Charset/collation: `utf8mb4` / `utf8mb4_unicode_ci` — verified with
     `SELECT @@character_set_server, @@collation_server`
   - Port `3306`, no conflicts found with other containers already running in this environment
4. **`mysql2`, `prisma`, `@prisma/client` installed** (`package.json` updated automatically by npm).
5. **`DATABASE_URL` added to `.env`**, alongside the existing `MONGO_URI` — both stay live through
   the whole migration; `MONGO_URI` is not touched until actual cutover.
6. **`npx prisma init --datasource-provider mysql`** — created `prisma/schema.prisma` and
   `prisma.config.ts` (Prisma 7's config format; it reads `DATABASE_URL` from env via
   `dotenv/config`, nothing hardcoded).
7. **End-to-end connectivity verified**: `npx prisma db pull` connected successfully and reported
   `P4001: introspected database was empty` — the expected result for a freshly provisioned target
   with no tables yet. Confirms `.env` → Prisma config → `mysql2` → the MySQL container are all
   correctly wired.

### Credentials in use for this migration (local dev only — not for production)

```
MySQL root password:     RootPass_EMPsystem2026
App user:                empsystem_app / AppPass_EMPsystem2026
DATABASE_URL:             mysql://empsystem_app:AppPass_EMPsystem2026@localhost:3306/empsystem?allowPublicKeyRetrieval=true
```

(`allowPublicKeyRetrieval=true` added during 4e — see the environment finding above.)

## Phase 2 — Schema Design (complete)

`prisma/schema.prisma` authored end to end: 24 models, matching the mapping from the planning
stage exactly. Full design rationale is in the file's own header comment block (business-key vs.
autoincrement PKs, why no `empId` foreign keys, the `Project.manager[]` `ref: 'Admin'` inconsistency
inherited from the original Mongoose schema, and how the polymorphic `AssetComponentCheck` table
works) — not duplicated here, that comment block is the source of truth going forward.

**Verification performed — not just "it validated," actually checked against the live database:**

1. `npx prisma validate` — schema is syntactically and referentially valid.
2. `npx prisma format` — normalized formatting.
3. `npx prisma generate` — client generation succeeded, a deeper check than validate alone.
4. `npx prisma migrate dev --name init_mysql_schema` — actually applied to MySQL. Required a
   one-time use of the **root** credentials rather than `empsystem_app`, because Prisma's dev
   migration workflow needs to create a temporary shadow database to detect drift, and the scoped
   app user correctly does *not* have that privilege (the least-privilege setup from Phase 1
   working as intended, not a bug to route around permanently). The generated migration SQL lives
   at `prisma/migrations/20260814055914_init_mysql_schema/migration.sql` — that file is the actual
   audit trail of every table/column/constraint created. `DATABASE_URL` in `.env` stays pointed at
   `empsystem_app` for all ongoing/application use; root was only used for this one command.
5. **Queried the live database directly** (not trusting Prisma's own success message):
   - `SHOW TABLES` → all 24 tables present, no more, no less.
   - `ENGINE=InnoDB`, `TABLE_COLLATION=utf8mb4_unicode_ci` confirmed on spot-checked tables.
   - The trickiest mapping in the schema — enum values containing spaces, e.g.
     `WorkType.Client_Location @map("Client Location")` — rendered correctly as
     `enum('WFO','WFH','Client Location')` in the real column definition.
   - The polymorphic `asset_component_checks` table has exactly the intended shape: nullable
     `assignment_history_id`/`maintenance_history_id`, required `phase` enum.
   - Queried `information_schema` for every actual foreign key constraint: **11 exist, all
     `ON DELETE CASCADE`, all on true parent-child normalization relationships** (e.g.
     `project_managers.project_id → projects.id`). Confirmed **zero** FK constraints exist from any
     `empId` column to `users`/`admins` — the deliberate design decision from the schema's header
     comment, verified as actually implemented rather than just stated.

## Correction made mid-Phase 2: Prisma client generator/adapter

While preparing to write Phase 3's ETL scripts, discovered the generated client from the default
`prisma-client` generator was pure ESM TypeScript (`import.meta.url`, `.ts` files, no
`package.json`) — not loadable via `require()` in this plain-CommonJS Node project. Tried
`moduleFormat = "cjs"` on that generator first; it had no effect on the output in this Prisma
version. Switched to the classic `provider = "prisma-client-js"`, which does emit proper
`require()`-able `.js` output.

That surfaced a second, unrelated change in Prisma 7: `PrismaClient` now requires an explicit
**driver adapter** rather than connecting straight from `DATABASE_URL` — the old built-in query
engine is gone. Installed `@prisma/adapter-mariadb` (Prisma's adapter package covers both MySQL and
MariaDB, since they're wire-protocol compatible) and confirmed the working pattern:

```js
const { PrismaClient } = require('./generated/prisma');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });
```

Verified against the live database (`prisma.user.count()` → `0`, the correct empty-table result).
This is the pattern every ETL script and, later, every rewritten controller will use going forward.

**Side finding while installing the adapter:** `npm audit` reports 32 vulnerabilities in the
dependency tree, 5 critical. Checked the source of each rather than assume they're new — 4 trace to
`firebase-admin`'s own dependencies (`fast-xml-parser`, `protobufjs`, `form-data`,
`websocket-driver`), pre-existing before this migration touched anything. The fifth is **`mongoose`
itself**, with a critical NoSQL-injection-related CVE. Not fixed here — out of scope for the DB
migration, and `mongoose` is still actively needed to read from MongoDB for the rest of this
migration — but worth a dedicated look afterward regardless of which database wins.

## Phase 3 — Data Migration / ETL (complete)

Six scripts in `migration/etl/`: a shared `_lib.js` (Mongo + Prisma connections, the enum-value
translation table, a `MigrationReport` helper), five collection-group scripts run in FK-safe order
by `run_all.js` (`01_core` → `02_onboarding` → `03_attendance_leave` → `04_projects_timesheets` →
`05_assets`). Each script is also independently runnable for re-running one group in isolation.

**Design choices worth recording:**
- Every row gets `legacyMongoId` set from the source document/subdocument's real Mongo `_id` —
  for wrapper-array collections (attendance, leave, timesheets) that's the *array entry's* own
  `_id`, not the wrapper document's, since that's the more specific and more useful trace.
- `mapEnum()` throws on any value it doesn't recognize rather than passing it through — a value
  the schema didn't anticipate should stop the run and get investigated, not get silently coerced.
- Per-document try/catch: one bad row is logged and skipped, not a reason to abort the whole batch.
- **`AssetComponentCheck`'s polymorphic `phase` column** is populated per source, matching the
  schema's design exactly: `doc.componentChecks` → `CURRENT`, an assignment's
  `componentChecksAtAssign`/`componentChecksAtReturn` → `ASSIGN`/`RETURN` (linked via
  `assignmentHistoryId`), a maintenance record's `componentChecks` → `MAINTENANCE` (linked via
  `maintenanceHistoryId`).

**Mid-build correction — Prisma client packaging, found before touching real data:**
The default `prisma-client` generator (used since Phase 1's `prisma init`) outputs pure ESM
TypeScript (`import.meta.url`, `.ts` files, no `package.json`) — not `require()`-able in this
plain-CommonJS project. `moduleFormat = "cjs"` had no effect on the output in this Prisma version.
Switched `schema.prisma`'s generator to the classic `provider = "prisma-client-js"`, which does
emit proper CJS `.js`. That surfaced a second, unrelated Prisma 7 change: `PrismaClient` now
requires an explicit **driver adapter**, not a bare `DATABASE_URL`. Installed
`@prisma/adapter-mariadb` (covers MySQL too — wire-protocol compatible) and confirmed the working
pattern, now used everywhere: `new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL) })`.
Full detail already logged above under Phase 2; repeated here because it's specifically what made
Phase 3's scripts work at all.

**Real data, actually migrated** (this sandbox's live MongoDB turned out to hold real records from
testing the Asset module earlier — this wasn't a synthetic dry run):

| Collection | Read | Written | Skipped |
|---|---|---|---|
| users | 1 | 1 | 0 |
| admins | 1 | 1 | 0 |
| admin_sessions | 1 | 1 | 0 |
| assets | 2 | 2 | 0 |
| asset_assignment_history | (2 entries) | 2 | 0 |
| asset_component_checks | (6 entries) | 6 | 0 |
| everything else | 0 | 0 | 0 |

Every other collection was empty in Mongo at migration time and correctly produced zero rows.

**Verification performed — queried MySQL directly, not just read the script's own summary:**
- Row counts in `information_schema` matched the ETL report exactly for every non-empty table.
- Spot-checked `users`: `emp_id`, `worktype` (`WFO`, correctly *not* enum-translated since it has
  no space), `mobile`, and `legacy_mongo_id` all matched the source document exactly.
- Spot-checked both `assets` rows against the source documents inspected beforehand: the returned
  asset correctly has `current_assignee_emp_id = NULL`; the actively-assigned one correctly carries
  it; `condition_at_return` is correctly `NULL` on the still-active assignment and `New` on the
  closed one — the subtle cases, not just the easy ones.
- Confirmed all 6 `asset_component_checks` rows landed as `phase = CURRENT` — correct, since
  neither real assignment record had a populated `componentChecksAtAssign`/`AtReturn` array in the
  source data, so no `ASSIGN`/`RETURN` rows should exist yet.

## Phase 4 — App Layer Rewrite (in progress)

### Architecture decision: a fully parallel `mysql/` tree, not edits to existing controllers

Given "Phase 4 adds a MySQL-backed code path alongside the existing one" was already the plan, the
question was *how* two backends coexist without either risking the other. Chose: a complete,
self-contained parallel tree at `mysql/` (`mysql/controller/`, `mysql/routes/`, `mysql/middleware/`,
`mysql/utils/`), mounted under a distinct `/api/mysql/*` prefix in `server.js`, alongside the
existing `/api/*` routes.

**Why this over the alternatives:**
- **Not a feature flag inside existing functions** — branching Mongo-vs-MySQL logic inside every
  existing controller function would mean touching ~20 files that currently work correctly, for no
  benefit until cutover actually happens. Every line of the existing `/api/*` surface stays
  completely unedited through all of Phase 4.
- **Not partial** — the MySQL-backed path gets its own complete login/session flow
  (`mysql/middleware/authenticateToken.js`, its own admin + employee login), rather than depending
  on Mongo-backed sessions. A session created by the old login can't be validated against MySQL's
  `employee_sessions`/`admin_sessions` tables (Phase 3 only copied the two sessions that existed at
  migration time, nothing created after). Any MySQL-backed protected route needs a MySQL-backed
  login to actually be testable end to end, so the auth foundation comes first and is complete on
  its own, not partial.
- **Reuses `utils/common.js` as-is** — `genbcryptPass`, `genJWTToken`, `genJWTTokenEmp`,
  `verifyJWTToken`, `validatePass`, `sendSuccessResponse`, `sendErrorResponse` are pure
  bcrypt/JWT/response-shaping utilities with no Mongoose dependency. No reason to duplicate them.
- **New `mysql/utils/prismaClient.js`** — a clean `PrismaClient({ adapter })` singleton for
  application runtime use, separate from `migration/etl/_lib.js` (which also connects to Mongo,
  something the app's MySQL-backed routes have no reason to do).

This also directly sets up Phase 5's comparison step: once a domain is rewritten, the same request
can be replayed against both `/api/...` and `/api/mysql/...` and the responses compared.

### Sub-phase 4a — Auth foundation (in progress)

`mysql/middleware/authenticateToken.js` (mirrors `middleware/authenticateToken.js` exactly, reading
from `employee_sessions`/`admin_sessions` via Prisma instead of Mongoose), plus a minimal admin
register/verify/login flow and employee login — the minimum needed for a MySQL-backed token to
exist and be validated, which every later sub-phase's protected routes depend on.

One deliberate deviation from a literal port: the original employee login
(`controller/userlogin/index.js`) signs the JWT with `userexit.fullName`, a field that doesn't
exist on the `User` schema (`firstName`/`lastName` do) — a pre-existing bug noted all the way back
during initial codebase review, and already worked around the same way when the Asset module was
built. The MySQL-backed version constructs the name from `firstName`/`lastName` instead of
reproducing that bug.

### Bug found and fixed while testing 4a: route-prefix collision in `server.js`

First test run of `/api/mysql/register` returned `401 Unauthorized` — for an endpoint with no auth
middleware attached at all. Cause: Express's `app.use(path, ...)` matches by path **prefix**, in
**registration order**, not by best/most-specific match. `/api/mysql/register` starts with `/api`,
so it was also matching every earlier `app.use('/api', authenticateToken, someRouter)` registered
above the new mysql mounts — and since `authenticateToken` runs unconditionally for any path under
that prefix and sends its own `401` response instead of calling `next()`, the request never reached
the mysql routers at all, regardless of what path was actually requested.

Fix: moved `app.use('/api/mysql', ...)` and `/api/mysql/@me` to the very top of the route
registration block, before any bare `/api`-prefixed router. This is a general rule for the rest of
Phase 4, not just this one fix — **every `/api/mysql/*` mount must stay registered before the
corresponding `/api/*` block**, or the same shadowing bug reappears for whatever's added next.

### Verification — actually ran the server and hit real endpoints, not just unit-level checks

Started `node bin/www` for real (both `MONGO_URI` and `DATABASE_URL` live simultaneously, exactly
as designed) and exercised the full auth loop over HTTP with `curl`:

- **Admin**: register → verify email → login → `GET /api/mysql/@me` with the token → `200`.
  Same route **without** a token → `401`, confirming the middleware actually gates it.
- **Employee**: no `addUser` endpoint exists yet (that's 4b), so seeded one throwaway test user
  directly via Prisma, then went through the real API: `POST /api/mysql/signin` → `200`, token
  payload correctly shows the constructed `fullName` (not the nonexistent field) → `GET
  /api/mysql/@me` with that token → `200`. Wrong password → `400 "Invalid Password"`, confirming
  `validatePass` rejects correctly, not just accepts.
- Deleted the throwaway admin/user/sessions afterward and re-verified row counts against
  `information_schema` matched the exact Phase 3 baseline (`users=1, admins=1, admin_sessions=1,
  employee_sessions=0`) — the test didn't leave residue in the database.

Dev server left running (`localhost:3030`) for any further manual testing.

### Sub-phase 4b — Core HR (complete)

Rest of `controller/admin` (`getAdminDetails`, `editAdminDetails`, `changePassword`,
`getEmployHrAndManager`, `getManagerList`, plus the admin forgot-password pair from
`routes/forgotpassRoute.js`), rest of `controller/userlogin` (`userLogout`, `changePassword`,
the OTP forgot-password flow), all of `controller/user` (add/edit/delete/get/getAll/closeAccount),
all of `controller/userinfo` (the onboarding profile + skills + search), and `checkLoggedin`.
`controller/userdocument` and the separate `controller/logout` were deliberately **not** ported —
see below.

**New shared piece this sub-phase needed: `mysql/utils/enumMap.js`.** 4a's enum handling
(`migration/etl/_lib.js`) only translated Mongo string → Prisma identifier, one direction, because
ETL only writes. App code reads too — and Prisma always represents an enum using its declared
identifier, never the raw `@map`'d DB string, so reading a `worktype` back without translation
would return `"Client_Location"` instead of the original `"Client Location"`. Built a bidirectional
version (`toPrismaEnum`/`fromPrismaEnum`) and applied it on every read that returns an enum field,
specifically so responses stay byte-identical to the Mongo-backed API for the eventual Phase 5
comparison step.

**Two bugs found and fixed, not reproduced** (same rule as 4a's `fullName` fix):
- `controller/admin`'s `changePassword` had `Admin.findOneAndUpdate(({email},{password:haspass}))`
  — the extra outer parens make it a JS comma expression, so Mongoose received only one argument
  and the password update never actually persisted. Fixed to a real update.
- `controller/admin`'s `getManagerList` selected a `empId` field on `Admin`, which doesn't exist
  on that schema (Mongoose silently no-ops an unknown projection field; Prisma would throw).
  Dropped from the selected fields.

**Deliberately not ported:**
- `controller/userdocument` — provably dead code: no route file has ever wired it up, in the
  original codebase or otherwise. Porting unused code isn't useful; noting the decision here
  instead.
- `controller/logout`'s standalone `/api/logout` — reads `res.body` instead of `req.body`, and
  queries a `token` field that doesn't exist on the `Section` schema (`jwtToken` does). Broken in
  its original form regardless of database; `userlogin`'s `userLogout` (mounted at `/signout`)
  already provides working logout. Not worth porting a non-functional endpoint faithfully.

**Bug found while testing, fixed immediately: Prisma's MySQL client rejects date-only strings.**
`addUser` with `"dateofjoining": "2026-01-01"` (exactly what the original API always accepted)
failed with `PrismaClientValidationError: premature end of input. Expected ISO-8601 DateTime` —
even on `@db.Date` columns, Prisma's MySQL connector wants a full ISO-8601 datetime, not a plain
date. This isn't specific to one field or one sub-phase — every date field across the entire
`mysql/` tree needs this. Built `mysql/utils/dateHelper.js` (`toDate()`) as a shared fix and
applied it everywhere a raw date string gets written in this sub-phase's code
(`User.dateOfJoining`, `EmployeeProfile.dateOfJoining`, `EmployeeProfile.dob`) — **this is now a
standing rule for every remaining sub-phase**: any date field written from request-body input
must go through `toDate()` first.

**Verification — full HTTP test pass, not unit-level:**
- Admin: `getadmin`, `editadmin`, `getEmployHrAndManager`, `getmanagerlist`, `changepass` (and
  confirmed the password change actually persisted this time, proving the bug fix).
- User: `adduser` → `getuser` (confirmed `worktype` round-trips as `"Client Location"`, not
  `"Client_Location"`) → `getallusers` → `edituser`.
- Onboarding profile: `setOrUpdateUserInfo` with two skills → `getuserinfo` (confirmed `workMode`
  round-trips as `"Work From Home"`) → `searchinfo?skill=Script` (confirmed **partial** match
  against "JavaScript", not exact — the original's regex behavior, deliberately not weakened to
  an exact match) → `searchinfo?name=` → `getallemployeeinfo` → `updateuserinfostatus`.
- `checkLoggedin`: confirmed `profileStatus` flips to `true` once a profile exists.
- **`closeAccount` tested against real data, not synthetic**: called on `EMP2155` (the real
  migrated employee, who genuinely holds an `Assigned` asset per Phase 3's data) — correctly
  rejected with `400` and the blocking asset listed, and confirmed the account was **not**
  mutated. Then called on a throwaway test employee with no assets — succeeded.
- All test data (admin, user, session, profile, skills) deleted afterward; row counts
  re-verified against `information_schema` matched the exact Phase 3 baseline on every table,
  including `assets` (unchanged, confirming the blocked close-account call had zero side effects).

## What's next — remaining Phase 4 sub-phases

- 4c: Attendance, Leave, Timesheet
### Sub-phase 4c — Attendance, Leave, Timesheet (complete)

The wrapper-per-employee Mongo collections (`Attendance`, `Leave`, `TimeSheet`) all become flat,
one-row-per-entry tables here, exactly as designed in Phase 2 — and that normalization turned out
to *fix*, almost as a side effect, several bugs the wrapper structure had been causing.

**Four real bugs found and fixed, not reproduced** (same policy as 4a/4b):

1. **`setLeave` rejected every single leave request, unconditionally.** The original compared
   `type !== 'Paid_Leave'` (underscore) against a Mongoose enum whose only valid matching value is
   `"Paid Leave"` (space) — that comparison can never be equal, so the "only paid leave allowed"
   check fired for every request regardless of type. This is the most consequential bug found in
   this migration so far: the leave-request feature has likely never worked. Fixed to compare
   against the real enum value; verified by submitting a real `"Paid Leave"` request end to end.
2. **`editLeave` almost always reported "not found," even for a valid ID.** `Leave.findById(leaveId)`
   searched the *wrapper* document's own `_id`, but `leaveId` is populated everywhere else in that
   file from a leave *entry's* (subdocument's) `_id` — those are different generated IDs, so the
   lookup essentially never matched. The relational `id` on `leave_requests` genuinely identifies
   one leave entry, so this is implemented for real now.
3. **TimeSheet's manager-list validation was dead code**, and crashed outright if the field was
   omitted: `listOfSelectedManager.lenght` (typo for `.length`) reads as `undefined`, and
   `undefined == 0` is `false`, so the "list of managers must not be empty" check never fired; if
   the field was missing entirely, reading `.lenght` off `undefined` threw before the check even
   ran. Fixed to the working, clearly-intended `.length === 0` check with a null guard.
4. **`updateTimeSheet` never actually updated anything.** Same wrapper-vs-entry mismatch as
   `editLeave`: it fetched the wrapper-per-employee document by Mongo `_id`, then assigned directly
   onto fields (`date`, `hoursWorked`, `listOfmanager`, ...) that only exist on the *nested*
   per-day sub-document, not the wrapper — Mongoose's strict mode silently dropped every one of
   those assignments. `getTimeSheetById`/`deleteTimeSheet` had the same root confusion, just less
   consequential since read/delete-by-wrong-id just returns "not found" rather than a silent no-op.
   All three now operate on the relational `id`, which genuinely identifies one timesheet row —
   verified by updating `hoursWorked` and confirming the new value actually persisted.

**One field intentionally left unfixed, not guessed at:** the original's `updateTimeSheet`
destructured `breakTime` (singular), which matches neither the schema's `breakStartTime` nor
`breakEndTime` — there's no way to tell whether that meant "update both" or was its own separate
mistake, so break times remain non-editable via this endpoint, same net effect as the original.

**One suspected bug flagged, deliberately NOT fixed:** `updateAttendanceForAbsentUsers` (the daily
cron job) skips its absent-marking logic whenever `User.status` is truthy — i.e., it only ever
processes *inactive* employees and skips every active one, which looks backwards for a job whose
entire purpose is marking active employees absent when they don't check in. Unlike the four bugs
above, this is a background job with no HTTP surface to verify a fix against, so it's been
faithfully replicated rather than silently inverted. Needs a product decision, not an engineering
guess — flagged here and in the code itself (`mysql/controller/attendance/index.js`).

**One judgment call:** `getEmployeeAttendanceToday` originally filtered on the attendance
wrapper's own `status` field before joining anything — that field is gone (redundant with
`User.status`, dropped during Phase 2 schema design), and its relationship to `User.status` was
never clearly consistent anyway (see the cron-job bug above). Rather than guess at a replacement
filter, it's dropped entirely — this endpoint now returns today's attendance for every employee
with a record.

**Verification — full HTTP pass, including every bug fix above tested directly:**
- Attendance: check-in (shift-window validated) → `checkIntimetoday` → check-out (8-hour rule
  validated, `totalHours` computed) → `checkOuttimetoday` → `getemployeeattendanceToday` (fullName
  and shift correctly constructed/round-tripped) → `getemployeeattendanceinfo` report.
- Leave: `setleave` with `"Paid Leave"` → succeeded (the bug fix); `setleave` with `"Sick Leave"`
  → correctly still rejected (the business rule itself, not the bug, still holds) → `getallLeave`
  → `leaveStatus` (approve, email + push sent) → `editLeave` (confirmed the edited reason actually
  persisted) → `cancelLeave`.
- Timesheet: create with an empty manager list → correctly rejected (the `.lenght` fix) → create
  with a manager → succeeded → `checkTimeSheetStatusOnDate` → `getAllTimeSheets` (confirmed still
  a raw array, not the standard envelope, matching the original's actual response shape) →
  `getTimeSheetById` → `updateTimeSheet` (confirmed `hoursWorked` actually changed) →
  `deleteTimeSheet` → re-fetch confirmed `404`.
- All test data deleted afterward; row counts re-verified against `information_schema` matched
  the Phase 3 baseline exactly on every table touched, `assets` included.

## What's next — remaining Phase 4 sub-phases

- 4d: Projects, notifications/FCM, admin dashboard
- 4e: The Asset module (all five controllers)

Each sub-phase gets built, verified against live MySQL, and committed independently — same
checkpoint rhythm as Phases 1–3, just applied inside Phase 4 given its size.

### Sub-phase 4d — Projects, notifications/FCM, admin dashboard (complete)

Also folded in `controller/mailservice` and `controller/image` here (small, no natural home of
their own) — that leaves sub-phase 4e as purely the asset module, nothing else outstanding.

**Cross-cutting fix applied first, before writing any 4d code:** `mysql/controller/leave` and
`mysql/controller/userinfo` (from 4b/4c) were importing `sendPushNotification` from the
**Mongo-backed** `controller/notification`, meaning MySQL-path leave approvals and profile-status
updates were reading FCM tokens out of MongoDB. Not caught earlier because nothing before this
sub-phase depended on push notifications actually resolving a token correctly — both calls are
fire-and-forget and swallow their own errors, so this would have failed silently in production.
New `mysql/controller/notification/index.js` created (mirroring the Mongo one, `fcmToken` table
via Prisma), and both imports repointed to it.

**That surfaced a second issue in the same file:** the original calls
`admin.initializeApp({credential: ...})` unguarded at module scope. Both the Mongo and MySQL
notification controllers now load in the same process — a second unguarded call throws "The
default Firebase app already exists" and crashes the server at startup. Guarded with
`if (!admin.apps.length)` so whichever loads first wins and the other reuses that app. Confirmed
by actually restarting the server and checking the startup log, not just reasoning about it.

**Two real bugs found and fixed, not reproduced:**
- **`addProject` (and `editProject`) crashed with a 500 whenever `clientContact` was omitted** —
  every field on it is documented as optional in the schema, but the original read
  `clientContact.clientFullName` etc. straight off the body with no guard, throwing a TypeError
  the instant `clientContact` itself was missing. Fixed with optional chaining; confirmed by
  posting a project with no `clientContact` at all and getting a `201`, where the original would
  have 500'd.
- **`getAttendanceData`'s `DayFour` bucket started at `presentCount: 4`** — a hardcoded non-zero
  seed value with no basis in the data, silently inflating that one bucket by 4 on every call,
  for every dashboard viewer. Clearly leftover test data rather than intent. Fixed to start at 0
  like every other bucket; confirmed by seeding 6 known alternating Present/Absent records and
  checking `DayFour` landed on the correct value instead of the phantom baseline.

**Two things preserved exactly, not "corrected," because the key itself is part of the response
contract callers already read:** `getDifferentCount`'s `totalAdmins` field actually counts
**clients**, not admins — kept under that name. `getAttendanceData`'s `DayRwo` key is a typo for
`DayTwo` — kept spelled that way too. Renaming either would silently break whatever already reads
these responses; that's a frontend-coordinated change, not something to slip into a migration.

**Verification — full HTTP pass:**
- Projects: added one with a full `clientContact` + documents + manager + teamMembers (confirmed
  the nested response shape — `manager[]`, `teamMembers[]`, `documents[]`, `clientContact{}` —
  reconstructed correctly from the four child tables and flat columns), added a second with no
  `clientContact` at all (the crash-fix test) → `getprojectbyid` → `editproject` (changed
  `workStatus`, replaced `teamMembers` wholesale, confirmed the old row was gone and a new one
  took its place — the delete-then-recreate replace semantics) → `getprojectbyempid` (found only
  the project actually containing that empId) → `getproject`.
- Dashboard: `getCoutData`, `getprojectdata` (status counts matched the two seeded projects
  exactly), `getattendancedata` (the `DayFour` fix, seeded and checked as above).
- `mailservice`'s `sendMailToall` exercised through the real route.
- All test data deleted afterward; row counts re-verified against `information_schema` matched
  the Phase 3 baseline exactly, `assets` included.

### Sub-phase 4e — Asset module (complete)

All five original controllers ported: `asset`, `assetMaintenance`, `assetDashboard`,
`assetDocument`, `assetImport`. Also the last sub-phase, which closes out Phase 4 entirely.

**New shared piece: `mysql/utils/assetResponse.js`.** The Asset document's embedded structures
(`assignmentHistory`, `maintenanceHistory`, `componentChecks`, `documents`, `currentAssignee`) are
now separate child tables or flat columns (Phase 2's design), and both `asset` and
`assetMaintenance` controllers return the full nested Asset shape — so the reconstruction logic
(`toAssetResponse`/`toAssignmentResponse`/`toMaintenanceResponse`) lives in one place instead of
being duplicated. Sub-array items get `_id` set to their real Prisma integer `id`, so any frontend
code reading `_id` off a nested assignment/maintenance/document entry keeps working unchanged —
same field name, different underlying value than the Mongo ObjectId it used to hold. Top-level
`componentChecks` entries deliberately do **not** get an `_id`, matching the original's
`{ _id: false }` subdocument schema.

**Two new relational-specific helpers in `asset/index.js`, replacing the original's in-memory
array-splice logic:** `replaceCurrentChecks` (delete all `phase=CURRENT` rows for an asset, insert
a fresh set — used when a raw `componentChecks` array is sent, taking precedence) and
`mergeCurrentChecks` (upsert by component label, leaving every other `CURRENT` row untouched — used
for the named-field form fields like `ram`/`ssd`/`keyboard`). Verified both semantics directly:
edited a test asset via named fields first (RAM/SSD/Keyboard preserved, Mouse added) and via a raw
`componentChecks` array on `assign`/`return`/`transfer` (full wholesale replacement, confirmed old
entries gone).

**Two bugs found and fixed, not reproduced, both response-shape breaks rather than logic bugs:**
- **`assetDashboard`'s `getWarrantyExpiringAssets` returned `purchaseCost` as a string, not a
  number.** The original returns raw Mongoose documents where `purchaseCost: Number` serializes as
  a real JSON number; this endpoint alone (unlike every other asset endpoint, which routes through
  `toAssetResponse`) returned raw Prisma rows, and Prisma's `Decimal` type serializes to a string.
  Same class of bug as 4c/4d's `hoursWorked`/`totalHours` fixes. Fixed by mapping the result through
  `num()` (and `fromPrismaEnum('condition', ...)`, since `condition` was coming back as the Prisma
  identifier `Beyond_Repair` instead of `Beyond Repair` for the same raw-row reason). Confirmed by
  re-querying after the fix: `purchaseCost: 75000` (number) and `condition: "Good"` instead of the
  broken values.
- **`assetImport`'s nested Excel-import writes crashed with `Argument 'asset' is missing.`** When
  creating an `Asset` row with nested `assignmentHistory`/`maintenanceHistory` records that
  themselves have nested `componentChecks`, Prisma only auto-connects the FK matching the *specific*
  nesting path it's writing through (`assignmentHistoryId`/`maintenanceHistoryId`) — `assetId` is a
  separate required relation on `AssetComponentCheck` and has to be passed explicitly even though
  the whole write is nested inside that same asset's `create` call. The live `asset/index.js`
  controller already does this correctly (`assignAsset`/`returnAsset` pass `assetId` explicitly into
  their nested `componentChecks.create`); the import controller's doubly-nested case just missed it
  on first pass. Fixed by generating the asset ID into a variable before the `create` call and
  passing it explicitly into every nested `componentChecks.create` under both
  `assignmentHistory` and `maintenanceHistory`. Confirmed by re-running the same import file
  end-to-end afterward — succeeded, and the nested response showed the assignment (New → In,
  correctly matched to the real migrated employee "Manish Sharma" → `EMP2155` by name) and
  maintenance (Out For Repair → In From Repair, correctly `Resolved`) both fully reconstructed.

**Environment issue hit and fixed before any of the above could even be tested:** see "A MySQL
container restart can break the app's DB connection" under Environment findings above
(`allowPublicKeyRetrieval=true`) — every single write in this sub-phase's first test attempt failed
with a connection-pool timeout until that was fixed. Not a code bug, but blocked all of 4e's
testing until resolved.

**Static file serving reused, not duplicated:** `assetDocument`'s upload/delete controllers point
at the exact same `asset/uploads/documents` directory and the existing `/asset-uploads` static
mount in `server.js` — one upload location shared by both parallel paths, matching the same
principle already applied to `utils/common.js` and `utils/emailService.js` reuse in earlier
sub-phases.

**Verification — full HTTP pass, every function exercised against the live server and live MySQL:**
- Read-only: `categories`, `getall`, `get` (against the two real migrated assets), `getbyempid`,
  `employeehistory` — all against real `EMP2155` data, not synthetic.
- Full write lifecycle on fresh test assets: `add` (named-field componentChecks) → `edit` (merge
  semantics, confirmed RAM/SSD/Keyboard preserved + Mouse merged in) → `assign` (shipping fields:
  courier/tracking/address, confirmed `locationType` derived correctly from the employee's
  `worktype`) → `history/assign` correction (confirmed `currentAssignee` updates when correcting an
  *Active* assignment) → `return` (condition + componentChecksAtReturn) → re-`assign` → `transfer`
  (two real employees, confirmed both the old assignment closes and a new one opens, `locationType`
  recalculated for the new assignee) → `return` again → `maintenance/add` → `maintenance/update`
  (resolved, confirmed `cost` comes back as a real number `1500.5`, not a Decimal string, and asset
  status returns to `Available`) → `maintenance/get` → `retire` → (separate asset) `markdead`
  (confirmed `condition: "Beyond Repair"` round-trips correctly through the enum map) → `delete` on
  a no-history asset (succeeded) → `delete` on a with-history asset (correctly rejected, "retire it
  instead").
- Dashboard: `countbystatus`, `countbycategory`, `overview`, `warrantyexpiring` (the bug fix above,
  re-verified after the fix).
- Documents: `upload` (real multipart PDF, confirmed served back via the shared `/asset-uploads`
  static mount) → `delete`.
- Import: a real two-laptop Excel register (New → In → Out For Repair → In From Repair for one
  serial with a name that matches a real employee; New with a name that matches no employee for the
  second) → confirmed `created: 2`, correct `unresolvedAssignments` entry for the unmatched name,
  and the fully reconstructed nested asset (assignment + maintenance history) on re-fetch — the bug
  fix above, re-verified after the fix.
- All test data (throwaway admin, throwaway second employee, every test asset, the uploaded test
  document) deleted afterward; row counts re-verified against `information_schema` matched the
  Phase 3 baseline **exactly** on every table: `users=1, admins=1, admin_sessions=1,
  employee_sessions=0, assets=2, asset_component_checks=6, asset_assignment_history=2,
  asset_maintenance_history=0, asset_documents=0`.

## Phase 5 — Cutover (complete)

Big-bang, as decided before any code was written (see the Key Decisions table). `server.js` now
mounts the MySQL-backed routers under the primary `/api/*` prefix instead of the Mongo-backed
ones; the redundant `/api/mysql/*` mirror from Phase 4 is retired (it was only ever a Phase-4
testing convenience, never a contract any real client depends on — the actual frontend has always
pointed at `/api/*`, so from its perspective nothing about the URL changed, only what answers it).

**Nothing was deleted.** Every original Mongo-backed `controller/*` and `routes/*` file is
untouched on disk, just no longer `require()`'d or mounted from `server.js`. Rollback, if ever
needed, is a single `git revert` of the cutover commit — no other file needs to change back.

### Pre-cutover safety check: confirmed no MongoDB drift since Phase 3

Before touching `server.js`, connected to MongoDB directly and compared every collection's live
count against the Phase 3 ETL baseline. Exact match on every collection (`users=1, admins=1,
assets=2, sections=1` [the Mongoose model backing admin sessions], `empsections=0`, everything else
`0`) — confirms nothing was written through the old Mongo-backed API during any of Phase 4's
testing, so the MySQL side already holds every real record that exists. Cutover would not have been
safe to do blind; this check is what made it safe to do at all.

**Found and flagged mid-check, not silently resolved:** `.env`'s `MONGO_URI` line was commented out
when this check began, despite being active (and the server successfully connecting) the last time
this session touched it. Neither the migration scripts nor this session's own edits touched that
line — the only tracked edit to `.env` this session was appending `?allowPublicKeyRetrieval=true`
to `DATABASE_URL`. Surfaced this to the user rather than silently uncommenting and moving on;
confirmed to temporarily uncomment it for the drift check. Left active afterward (matching the
last known-good state, and needed for `config/db.js` to keep connecting without a startup error) —
worth a look if this comes up again, since the cause is still unexplained.

### Functional-parity audit before flipping anything

Diffed every route file's endpoint list, Mongo-backed vs. MySQL-backed, rather than assume Phase
4's sub-phases covered everything:

- **Full parity confirmed** on every domain covered by 4a–4e: admin, user login, user, userinfo,
  attendance, leave, timesheet, project, notifications, dashboard, mailservice, image, and all five
  asset controllers. (One apparent gap, `leaveRoutes.js`'s `/acceptleave`/`/rejectleave`, turned out
  to be a false positive from a loose grep matching **commented-out** route registrations in the
  original file — those endpoints were never actually wired up even in the Mongo-backed app, so
  there was nothing to port.)
- **`routes/forgotpassRoute.js`** (admin `resetpassword`/`sendmailforgotpass`) — already folded into
  `mysql/routes/adminRoutes.js` back in 4b, confirmed by re-reading both files side by side.
- **`routes/ipRoute.js`** — never came up in any sub-phase log, and for good reason: its controller
  (`controller/getIp/getipaddress.js`) has zero Mongoose/database dependency at all, just
  `os.networkInterfaces()`. Nothing to port — reused as-is, required directly into the new
  `server.js` and mounted under `/api` unchanged.
- **`routes/logoutRoute.js`** (`/api/logout`) — confirmed, re-reading it now, still the same
  broken code flagged back in 4b (`res.body` instead of `req.body`, queries a `token` field that
  doesn't exist on the session schema — `jwtToken` does). Every call to this endpoint has always
  malfunctioned, database notwithstanding. Deliberately dropped at cutover, not ported — `userLogin`'s
  working `/signout` (already live under `/api`) is the actual functioning logout endpoint.

### Bug found and fixed during cutover: `bin/www`'s dotenv load order

First post-cutover server start crashed immediately: `TypeError: Cannot read properties of
undefined (reading 'prepareCacheLength')` inside `@prisma/adapter-mariadb`, meaning
`mysql/utils/prismaClient.js` read `process.env.DATABASE_URL` as `undefined`. Root cause:
`bin/www` has always required `../server` **before** calling `require('dotenv').config()` — a
genuine ordering bug, database-independent. It never surfaced before because two of the
Mongo-backed controller files (`controller/attendance/index.js`, and, redundantly,
`mysql/controller/attendance/index.js`) each call `require('dotenv').config()` themselves as a
side effect, and the old `server.js` happened to require the Mongo-backed one early enough to
populate `process.env` before anything read it. Once the Mongo-backed requires were removed from
`server.js`'s top as part of cutover, that accidental safety net went with them, and the real bug
underneath was finally exposed. Fixed at the actual source — moved `require('dotenv').config()` to
the first line of `bin/www`, before requiring `server.js` or `config/db.js` — rather than
re-introducing some other early require as a workaround. Confirmed by a clean restart afterward.

### Verification — full HTTP smoke test across every domain through the primary `/api/*` path

Registered a throwaway admin through `/api/register` → `/api/verifyemail` → `/api/login` (the
*primary* path, not `/api/mysql` this time) and exercised one representative endpoint per domain to
confirm the wiring, not re-run every sub-phase's exhaustive test suite again (that already happened
in 4a–4e against the identical underlying controllers):

- `/api/@me` — `401` without a token, `200` with one.
- `/api/getallusers` — returned the real migrated `EMP2155` record.
- `/api/asset/getall` / `/api/asset/dashboard/overview` — returned the real 2 migrated assets,
  counts correct (`assignedAssets: 1`, matching `AST-LAP-9127`'s real state).
- `/api/getCoutData` — correct counts against real data.
- `/api/signin` — reachable and hitting the real database (validated a bad-request case; full
  login flow already proven in 4a).
- `/api/getallLeave`, `/api/timesheets`, `/api/getproject` — all reachable, all `200`, real
  (currently empty) data.
- `/api/uploadlogo` — reachable, correct validation response for a request with no file attached.
- `/api/notifications/save` (public, specific-prefix route) — saved an FCM token for the real
  `EMP2155` employee.
- `/api/service/sendmaitoall` (auth-gated, specific-prefix route) — reachable and executed.
- `/api/ip` — reachable, correctly returned "not found" for this machine's actual network
  interfaces (expected — the original only ever matches one specific `192.168.43.x` subnet, and
  that's just not this machine's network, database notwithstanding).

All test data (throwaway admin, its session, the test FCM token on the real `EMP2155` record)
deleted afterward; row counts re-verified against `information_schema` matched the Phase 3 baseline
**exactly**: `users=1, admins=1, admin_sessions=1, employee_sessions=0, assets=2,
asset_component_checks=6, asset_assignment_history=2, fcm_tokens=0`.

### What's deliberately still open after cutover

Per the plan laid out back in Phase 1 (the `legacyMongoId` columns' whole purpose), nothing gets
torn down immediately just because cutover succeeded:

- **MongoDB stays running and `MONGO_URI` stays live in `.env`** — not queried by the app anymore
  (nothing requires the Mongo-backed controllers from `server.js` now), but available for direct
  inspection/comparison during the stabilization window.
- **The Mongo-backed `controller/*`/`routes/*` files stay in the repo, untouched** — the rollback
  path, and a reference if any response-shape question comes up.
- **`legacyMongoId` columns stay on every table** — planned removal only after cutover is confirmed
  stable in real use, not as part of this phase.
- **Mongoose itself stays a dependency** — removing it is a separate future cleanup, not bundled
  into cutover.

None of this is deferred out of caution about the cutover itself — the verification above is
real, not provisional. It's deferred because a rollback window has value precisely *because*
nothing forces it to be used.

## Post-cutover cleanup — MongoDB fully removed from the project (complete)

Explicit follow-up request, separate from Phase 5 itself: "remove the mongodb connections and
models etc from this project and make sure do not change anything else." The stabilization-window
deferral above was the plan *by default*; this replaces that default once asked for directly. Scope
was the codebase only — **MongoDB itself (the running server and its data) was left completely
untouched**, since nothing asked for the database to be torn down, only this project's code.

**Deleted, after confirming nothing in the live `mysql/`-backed app referenced any of it:**
- `config/db.js` (the Mongoose connection helper) and the `mongoose` dependency itself
  (`npm uninstall mongoose` — 26 packages removed; `package.json`/`yarn.lock` updated).
- `models/` — all 14 Mongoose schema files.
- `controller/` and `routes/` — every Mongo-backed controller/route, now that `mysql/controller/`
  and `mysql/routes/` are the only implementation `server.js` has pointed at since Phase 5. Two
  files kept: `controller/getIp/getipaddress.js` and `routes/ipRoute.js` — confirmed to have zero
  Mongoose/database dependency at all (pure `os.networkInterfaces()` lookup), and still actively
  `require()`'d by the live `server.js`.
- `asset/models/Asset.js`, `asset/controller/*`, `asset/routes/*` — the pre-migration Mongo-backed
  Asset module, fully superseded by `mysql/controller/asset*` since sub-phase 4e. Kept
  `asset/constant/assetEnums.js`, `asset/utils/htmlText/*`, and `asset/uploads/` — confirmed each
  has zero Mongoose dependency and the live `mysql/controller/asset*`/`mysql/routes/asset*` files
  still actively import or write to them.
- `script.js` — an unused, non-`require()`'d, standalone utility script that connected to a remote
  MongoDB Atlas cluster with a hardcoded credential and dropped every collection on it. Never part
  of the app's require graph; flagged separately from the routine cleanup below because a live
  credential sitting in a source file is itself a finding worth knowing about, migration aside.
- `migration/etl/*` — the six ETL scripts from Phase 3. Kept out of Phase 5's "leave it all in
  place for now" list initially, but they exist entirely to read from MongoDB via the
  now-deleted `models/*`, so removing those models left them non-functional as standalone scripts
  regardless. Since they're one-time, already-completed, and squarely "MongoDB connections... etc"
  by the plainest reading of the request, removed rather than left behind half-broken.
  `migration/MIGRATION_LOG.md` (this file — the actual "document for this process" asked for back
  in Phase 1) is prose, not code, has no Mongo dependency, and stays.
- `.env`'s `MONGO_URI` lines (both the active one and the commented-out Atlas backup) — `.env`
  isn't tracked by git, so this has no commit of its own, but it's part of "remove the
  connections."

**Deliberately not touched, as out of scope for "the project['s code]":**
- MongoDB itself — the local server and its actual data were never asked to be stopped or deleted,
  and weren't.
- `prisma/schema.prisma`'s `legacyMongoId` columns — a MySQL schema change (would need its own
  Prisma migration), not a MongoDB connection or model, and still explicitly a "later, once stable"
  decision per Phase 5.

**One pending, pre-existing, unrelated change absorbed by this cleanup:** `controller/mailservice/index.js`
had an uncommitted edit from earlier in this project's history (predating this migration) that was
deliberately left out of the Phase 5 commit as out-of-scope. That file is now deleted as part of
this cleanup (superseded by `mysql/controller/mailservice` since 4d), so that pending edit is now
moot rather than something to carry forward.

**Verification — full restart and re-run smoke test, not just "it deleted cleanly":**
- Searched the entire live codebase (everything except the now-removed `migration/etl/`) for any
  remaining reference to `mongoose`, `MONGO_URI`, or a `mongodb://`/`mongodb+srv://` URI — zero
  matches.
- `node --check` on every remaining `.js` file under `server.js`, `bin/www`, `mysql/`, `asset/`,
  `controller/`, `routes/` — all clean.
- Restarted the app from a fresh process: starts cleanly, no Mongo-connection error line at all
  now (previously a harmless-but-present `MongooseError` log line even post-cutover, from
  `config/db.js`'s doomed connection attempt — now gone because the attempt itself is gone).
- Re-ran a representative endpoint per domain against the live server exactly as done for Phase 5
  (`/api/@me`, `/api/getallusers`, `/api/asset/getall`, `/api/asset/dashboard/overview`,
  `/api/ip`, `/api/getCoutData`, `/api/getallLeave`, `/api/timesheets`, `/api/getproject`,
  `/api/notifications/save`, `/api/getemployeeattendanceToday`) — all still correct against real
  MySQL data.
- All test data cleaned up afterward. Row counts checked against `admins`/`admin_sessions`/
  `fcm_tokens` (unaffected by this cleanup, all back to their pre-test values).

**One thing found during verification that is not part of this cleanup, and not touched:** the
`users` table now has 2 rows instead of the 1 that's been the constant baseline since Phase 3 — a
second real employee (`EMP9156`) appeared between the Phase 5 work and this cleanup, with a
real-looking personal email, not created by any test script in this session. That's genuine new
data from the MySQL-backed API now being live and in real use — exactly the intended outcome of
Phase 5 — not a discrepancy to investigate or revert.

## Phase log

| Phase | Status | Notes |
|---|---|---|
| 1. Setup | ✅ Complete | Git baseline, MySQL provisioned, Prisma wired, connectivity verified |
| 2. Schema Design | ✅ Complete | 24 tables live in MySQL, verified against `information_schema`, not just Prisma's own report |
| 3. Data Migration (ETL) | ✅ Complete | Real data migrated (small dataset), 100% written, 0 skipped, spot-checked against source including edge cases |
| 4. App Layer Rewrite | ✅ Complete | Parallel `mysql/` tree; 4a–4e all complete, verified over real HTTP requests |
| 5. Cutover | ✅ Complete | `/api/*` now MySQL-backed; Mongo-backed code untouched but unmounted for rollback; verified across every domain over real HTTP requests |
| Post-cutover cleanup | ✅ Complete | All Mongo connections/models/controllers/routes removed from the project by explicit request; MongoDB server/data itself left untouched |
