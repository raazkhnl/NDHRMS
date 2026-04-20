# NDHRMS — Nepal Digital HR Management System

**Integrated PSC Recruitment · MoFAGA Transfer · HRMIS**

A reference implementation of Nepal's proposed digital HR platform — candidate registration through exam, merit list, placement, HRMIS onboarding, tenure tracking, 6-criterion transfer scoring, calendar-driven transfer windows, override audit, CIAA/OAG watchdog access, and annual transparency reports.

Built end-to-end on MERN (MongoDB · Express · React · Node.js). No external UI library — pure CSS with design tokens.

---

## Table of Contents

1. [What you'll find](#1-what-youll-find)
2. [Architecture](#2-architecture)
3. [Quick start — Docker](#3-quick-start--docker)
4. [Quick start — Manual](#4-quick-start--manual)
5. [Test credentials](#5-test-credentials)
6. [Guided walkthrough — every phase, every screen](#6-guided-walkthrough--every-phase-every-screen)
7. [API reference](#7-api-reference)
8. [Data model](#8-data-model)
9. [Security model](#9-security-model)
10. [Troubleshooting](#10-troubleshooting)
11. [Production deployment checklist](#11-production-deployment-checklist)
12. [Known limitations](#12-known-limitations)
13. [Credits & License](#13-credits--license)

---

## 1. What you'll find

NDHRMS covers two government systems sharing one HRMIS data backbone:

| Phase | Owner | Scope |
|-------|-------|-------|
| **A** | PSC | NID login → exam → merit list → section placement → HRMIS baseline |
| **B** | MoFAGA | Tenure tracking → scoring → calendar → transfer orders → watchdog |
| **Link** | HRMIS | One shared backbone — zero manual re-entry between systems |

### Five design principles, all enforced

| # | Principle | How it's enforced in code |
|---|-----------|---------------------------|
| P1 | **Transparency** | Every decision on `/transparency` + `/api/audit/public/dashboard` + published override justifications |
| P2 | **Rule-based** | Same 6-criterion weighted formula for every officer. Overrides require ≥100-char justification + counter-sign |
| P3 | **Timeliness** | Auto-flag at 90% max tenure, linear T-60→T-0 state machine, 15% ministry cap, no-gap rule |
| P4 | **Merit + context** | Tenure 25 / Edu 20 / Exp 20 / Hardship 15 / Performance 10 / Personal 10 + tier bonus |
| P5 | **Auditability** | SHA-256 chained audit log, 3+ override auto-CIAA alert, public chain verification |

---

## 2. Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                   REACT + VITE FRONTEND (port 5173)                 │
│                                                                    │
│  Public                 Candidate            Admin                 │
│  ────────               ─────────            ─────                 │
│  /                      /profile *NEW        /admin/ministry        │
│  /login  (NID+OTP)      /dashboard           /admin/psc  (6 tabs)   │
│  /results               /priority            /admin/mofaga (11 tabs)│
│  /merit-list            /officer             /admin/watchdog (4 tabs)│
│  /grievance             /admit-card                                 │
│  /transparency *P1                                                  │
│                                                                    │
│  Navbar with profile dropdown  ·  Breadcrumbs + Back button        │
│  NidLookup component confirms NIDs on every form                   │
└──────────────────────────────┬─────────────────────────────────────┘
                              │ JWT · JSON over HTTPS
┌─────────────────────────────┴──────────────────────────────────────┐
│                   EXPRESS API (port 5000)                           │
│                                                                    │
│  21 route modules · RBAC middleware · bcrypt passwords             │
│  SHA-256 simulated DSC · SHA-256 hash-chained audit log            │
└─────────────────────────────┬──────────────────────────────────────┘
                              │
┌─────────────────────────────┴──────────────────────────────────────┐
│                   MONGODB 7.x (port 27017)                          │
│  23 collections across PSC · HRMIS · MoFAGA · Integrity layers     │
└────────────────────────────────────────────────────────────────────┘
```

### Folder layout

```
psc-system/
├── server/                      # Express + Mongoose
│   ├── models/                  # 23 Mongoose schemas
│   ├── routes/                  # 21 route modules
│   ├── middleware/              # auth (JWT), requireRole (RBAC)
│   ├── seed/seedData.js         # Full reference dataset
│   ├── Dockerfile
│   └── .env.example
├── client/                      # React + Vite + pure CSS
│   ├── src/
│   │   ├── pages/               # Public + candidate + admin dashboards
│   │   ├── components/
│   │   │   ├── Navbar.jsx       # Rebranded NDHRMS header with profile menu
│   │   │   ├── Breadcrumbs.jsx  # Auto-crumbs + back button
│   │   │   └── NidLookup.jsx    # NID→name resolution badge
│   │   ├── context/             # AuthContext (candidate) + AdminAuthContext
│   │   └── utils/
│   │       ├── api.js           # axios candidate instance
│   │       ├── adminApi.js      # axios admin instance
│   │       ├── avatar.js        # Default SVG avatar generator
│   │       ├── lookups.js       # Central dropdown source of truth
│   │       ├── admitCard.js     # jsPDF admit card with avatar
│   │       └── placementOrder.js # jsPDF DSC-signed placement PDF
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .env.example
├── docker-compose.yml           # Mongo + server + client + seeder
├── LICENSE                      # MIT (RaaZ Khanal 2026)
└── README.md                    # This file
```

---

## 3. Quick start — Docker

Requires Docker 20+ and Docker Compose v2.

```bash
# 1. Extract
unzip psc-system-v3-FINAL.zip && cd psc-system

# 2. (Optional but recommended) Strong JWT secret
export JWT_SECRET=$(openssl rand -hex 32)

# 3. Build + start the stack
docker compose up -d --build

# 4. Seed the reference dataset (one-time, ~5 seconds)
docker compose --profile seed run --rm seed

# 5. Open
open http://localhost         # Client (via nginx)
open http://localhost:5000    # API root
open http://localhost:5000/health    # Health check
```

Useful ops commands:

```bash
# View logs
docker compose logs -f server
docker compose logs -f client

# Rebuild one service
docker compose build server && docker compose up -d server

# Stop everything
docker compose down

# Stop AND wipe MongoDB data
docker compose down -v

# Re-seed (useful after testing wrecks the data)
docker compose --profile seed run --rm seed
```

---

## 4. Quick start — Manual

Requires Node 20+, MongoDB 7.x (or MongoDB Atlas URI).

### Backend

```bash
cd server
cp .env.example .env
# Edit .env — set MONGODB_URI + JWT_SECRET
npm install
npm run seed              # inserts reference dataset
npm run dev               # nodemon on :5000
```

### Frontend (new terminal)

```bash
cd client
cp .env.example .env
# Default VITE_API_BASE_URL points to localhost:5000
npm install
npm run dev               # Vite on :5173
```

Open **http://localhost:5173**.

---

## 5. Test credentials

### Admin users — all password `admin123` (change in production!)

| NID | Role | Designation | Dashboard |
|-----|------|-------------|-----------|
| `999-999-9999` | psc-admin | PSC Chairman · Dr. Prem Bahadur KC | `/admin/psc` |
| `888-888-8888` | mofaga-admin | MoFAGA Secretary · Binod Khatiwada | `/admin/mofaga` |
| `900-000-0001` | ministry-secretary | MoFA Secretary · Rajendra Sharma | `/admin/ministry` |
| `900-000-0002` | ministry-secretary | Finance Secretary · Sunita Gurung | `/admin/ministry` |
| `900-000-0003` | ministry-secretary | Home Affairs Secretary · Ajay Yadav | `/admin/ministry` |
| `900-000-0004` | ministry-secretary | Physical Infra Secretary · Meena Tamang | `/admin/ministry` |
| `777-777-7777` | ciaa-auditor | CIAA Commissioner · Ishwori Paudel | `/admin/watchdog` |
| `666-666-6666` | oag-auditor | OAG · Tara Devi Bhattarai | `/admin/watchdog` |

### Candidate NIDs — OTP login at `/login`

OTPs print to the **server console** in development. Look for `📱 OTP for <NID>: <6 digits>`.

| NID | Name | Qualification | State |
|-----|------|---------------|-------|
| `112-345-6789` | Ram Shrestha | Master · Public Admin | Passed, priorities set (demo) |
| `223-456-7890` | Sita Thapa | Bachelor · CS | Failed; has grievance filed |
| `334-567-8901` | Krishna Poudel | Master · Economics | Waitlisted; grievance under review |
| `445-678-9012` | Anjali Rai | +2 · Biology | Fresh; grievance resolved (demo) |
| `556-789-0123` | Bikash Maharjan | Bachelor · Civil Eng | Fresh, unscored |
| `667-890-1234` | Nisha Gurung | Master · BBA | Passed (rank 8) |
| `778-901-2345` | Rajesh Bhandari | Master · Constitutional Law | Passed (rank 7) |
| `889-012-3456` | Priya Sharma | Bachelor · Intl Relations | Passed (rank 6) |
| `990-123-4567` | Deepak Tamang | Master · IT | Passed (rank 10) |
| `101-234-5678` | Sushmita Basnet | Master · Political Science | Passed (rank 9) |

### Pre-existing HRMIS officers — already in service

| NID | Name | Posting | Tier | Tenure | Notes |
|-----|------|---------|------|--------|-------|
| `700-000-0001` | Gopal Adhikari | Finance / Revenue Policy | A | ~32 mo | Near max → gets flagged |
| `700-000-0002` | Rojina Shrestha | Home / Immigration | B | ~18 mo | Has verified medical exemption |
| `700-000-0003` | Sanjay Limbu | Physical Infra / Roads | C | ~23 mo | Remote posting, near max |

---

## 6. Guided walkthrough — every phase, every screen

This walkthrough takes about **15 minutes** and exercises every button in the system. Each step tells you *what to click*, *what will happen*, and *why it matters per the spec*.

### Phase 1 — Candidate registers and applies

**Who:** A new citizen wanting to apply for a civil-service exam.

**Steps:**

1. **Open** `http://localhost:5173/login`
2. **Type NID** `445-678-9012` in the login field
   - The NidLookup component immediately queries the registry; within a second you'll see a green checkmark and the name "Anjali Rai" with DOB and gender. This **confirms the NID before you commit** — no wasted OTPs on typos.
3. **Click** "Send OTP"
4. **Switch to the server terminal** — copy the 6-digit OTP from the log line `📱 OTP for 445-678-9012: 123456`
5. **Paste** the OTP back in the browser and click "Verify"
6. You land on **`/profile`** — the new unified candidate hub (as of v3)

**Explore `/profile`:**

- **Left sidebar** shows your avatar (gender-aware default SVG), name, NID, and 11 navigation tabs
- **Overview tab** shows a 6-step *stage tracker*: Registered → Applied → Results → Priority → Placed → HRMIS Active. Each step marked `done` / `active` / `pending` with color coding
- Eight clickable count cards below — each navigates to the relevant tab
- **Quick Actions** at the bottom: Apply for Exam · File Grievance · Check Results · View Merit List

**To apply for an exam:**

7. **Click** "Apply for Exam" (or Dashboard in the profile menu)
8. On `/dashboard`, the three tabs show:
   - **Tab 1** Personal Info — auto-filled from your NID registration
   - **Tab 2** Education — auto-filled from ExamRegister (ERN)
   - **Tab 3** Apply for Exams — lists available posts with vacancies
9. **Pick a post** (e.g., "Kharidar" for Anjali's qualification)
10. **Choose** a payment method (eSewa / Khalti / FonePay / ConnectIPS / Bank) — this is simulated instant success in development
11. **Click** "Submit & Pay"
12. Tab 4 appears — **My Applications** with the new application showing `appeared` status
13. **Click** ⬇ Admit Card — a PDF downloads with your photo placeholder showing the **gender-aware default avatar silhouette** (navy-on-gold for Male, crimson-on-pink for Female)

### Phase 2 — Ministry Secretary enters sections (already seeded, but try it)

**Who:** Secretary of a ministry declaring vacancies.

1. Logout, go to `/admin/login`
2. NID `900-000-0001` password `admin123` → lands on `/admin/ministry` as MoFA Secretary
3. Page shows a list of sections this ministry has already locked (seeded). To add a new one:
   - **Click** "+ Add Section" — a form appears
   - Fill: section name, vacant positions, degree level, preferred stream, specialization
   - **Click** "Save Draft"
   - Review in the list → **click** "🔒 DSC Sign & Lock" — SHA-256 signature generated, section is now immutable
4. Once locked, the section is **immediately visible** to candidates on their Priority form

### Phase 3 — PSC Admin scores and publishes merit list

**Who:** PSC Chairman.

1. Logout, login as `999-999-9999` / `admin123` → `/admin/psc`
2. **Top stats** (clickable — new in v3): Applications · Unscored · Results Published · Pending Grievances. Click any card to jump directly to the relevant tab.
3. **Score Entry tab** — unscored applications appear. Example:
   - Click Bikash Maharjan's application (PSC-2026-100005)
   - Enter written 72, interview 17
   - System auto-computes total 89 → status `pass` (threshold 60+)
4. **Merit List tab** — each post has a **Publish** button
   - Click Publish for "Officer (Engineering)"
   - System auto-ranks by total score, sets `published=true`, flips application status to `result_published`
5. Public `/merit-list` now shows Bikash (NID masked) at rank 1 of that post
6. **Grievances tab** — click "Respond" on Sita's pending grievance, resolve or reject with admin notes

### Phase 4 — Priority + Placement algorithm

**Who:** The passed candidate + PSC admin running the algorithm.

1. Logout, log back in as `667-890-1234` (Nisha Gurung — pre-scored, passed, rank 8)
2. From `/profile` sidebar → **Priority & Placement** tab
3. If priorities aren't set: click **Submit Priorities** → rank your top 3 ministries (dropdowns sourced from `lookups.js`)
4. **Save**
5. Logout, back in as PSC admin (`999-999-9999`)
6. `/admin/psc` → **Placement** tab → **🎯 Run Algorithm**

The algorithm (per spec §3):
- Loads all passed candidates sorted by `totalScore` DESC
- For each candidate in order:
  - Try priority 1 ministry → score all its open sections (exact=3 / stream=2 / general=1 / none=0) → assign to best-matching section with seats
  - If priority 1 full, try priority 2, then 3
  - National fallback: best matching section anywhere in the country
  - Generate SHA-256 DSC-signed placement order
7. **Review** the draft placements → **Publish All**
8. On publish: every placed candidate's `Officer` record is auto-created with `postingHistory[0]`, `tenureStartDate=now`

### Phase 5 — HRMIS Officer profile

**Who:** The newly placed candidate.

1. Logout, log back in as the candidate you just placed
2. `/profile` → **HRMIS Officer** tab shows:
   - Employee ID `HRMIS-2082-XXXXXX`
   - Current ministry / section / tier
   - Months of tenure
   - Status badge

Or navigate to the full-screen `/officer` page (links from the tab) for:
- Complete posting history timeline
- Transfer score panel (once MoFAGA runs scoring)
- Transfer orders list with inline "File Appeal" form
- Appeal history with committee decisions

### Phase 6 — MoFAGA tenure scan

**Who:** MoFAGA Secretary.

1. Logout, login as `888-888-8888` / `admin123` → `/admin/mofaga`
2. **Top stats** (clickable — new in v3): Active Officers · Approaching Max · Exceeded Max · In Transfer Queue
3. **Overview tab** → **⚡ Run Tenure Scan** — scans all 40k officers (well, the 3 seeded + any new ones) against tier rules:
   - Tier A: max 36 months (flag at 90% = 32.4 mo)
   - Tier B: max 48 months (flag at 43.2 mo)
   - Tier C: max 24 months (flag at 21.6 mo)
   - Tier D: max 24 months (flag at 21.6 mo)
   - Specialist: max 60 months (flag at 54 mo)
4. **Transfer Queue tab** — flagged officers appear with visual tenure progress bars
5. Gopal Adhikari (32mo Tier A) and Sanjay Limbu (23mo Tier C) should be flagged

### Phase 7 — Transfer scoring engine

**Who:** Still MoFAGA Secretary.

1. Same dashboard → **Scoring tab** → **🎯 Run Scoring**
2. For each queued officer, the engine computes 6 criteria independently:
   - **Tenure (25%)** days-since-joining ÷ max-tenure × 100
   - **Education match (20%)** 3 / 2 / 1 / 0 against destination section requirements
   - **Experience (20%)** years of relevant government service
   - **Hardship equity (15%)** officers who never served tier C/D score higher
   - **Performance (10%)** 3-year appraisal average (1–5 → 20 / 40 / 60 / 80 / 100)
   - **Personal circumstance (10%)** verified exemptions boost score
3. Final = weighted sum + tier hardship bonus (0 / +5 / +15 / +25)
4. Ranked by final DESC; tiebreaker is total years of government service
5. **Officer-visible breakdown** — log back in as an officer and visit `/profile` → **Transfer Score** tab. Every criterion shown with raw score, weight, and weighted contribution (spec §6 step 5: *"Each officer sees their exact score per criterion"*)

### Phase 8 — Transfer calendar T-60 → T-0

1. MoFAGA → **Transfer Windows tab** → fill the form with defaults → **Create Window**
2. Click the newly-created window card
3. **Advance → T-60** — generates draft transfer orders
   - Respects **15% per-ministry cap**
   - **Different-ministry constraint** — can't stay in same ministry
   - **Education-fit** match against destination section
4. **Advance → T-30** — appeal window opens. Officers can log in and file appeals from their `/profile` → Transfer Orders tab
5. **Advance → T-15** — committee reviews appeals, regenerates final list
6. **Advance → T-10** — **No-gap rule** kicks in: every final order needs receiving-ministry confirmation. If any are unconfirmed, advance is blocked with HTTP 409 and a list of which orders.
   - Pass `autoConfirm: true` to bypass for pilot (or confirm individually via `POST /transfer-window/orders/:id/confirm`)
   - DSC-signed orders issued
7. **Advance → T-0** — window opens
8. **Advance → closed** — officers' `postingHistory` updated, tenure clocks reset, new postings active

### Phase 9 — Transparency & Watchdog

**Public side:** `/transparency` shows:
- **Chain-intact badge** — SHA-256 audit chain verification status
- **Integrity metrics** — total overrides, appeals, open CIAA alerts, audit record count
- **Recent transfer windows** table with state + counts
- **Workforce distribution** — by ministry, by tier
- **Published override justifications** — full text of every override, system recommendation, actual posting, proposer + counter-signer
- **5 design principles** card

**Admin side:** Log in as CIAA (`777-777-7777`) or OAG (`666-666-6666`) → `/admin/watchdog`:
- **Overview** — chain-intact badge, live counts
- **Audit Log** — paginated SHA-256 chained entries with hash previews
- **Chain Integrity** → **🔐 Re-verify Chain** → green verification card
- **CIAA Alerts** — automatic alerts when any secretary hits 3+ overrides in one window

### Phase 10 — Anti-gaming + Annual Report

1. MoFAGA → **Emergency tab** → request emergency transfer (50+ char reason required)
2. Log in as PSC admin (acts as Chief Secretary) → approve via API `POST /anti-gaming/emergency/:id/approve` → 24-hour publish clock starts
3. Back as MoFAGA → click **⚡ Publish & Apply** → SHA-256 signed + HRMIS posting updated instantly
4. **Annual Report tab** → enter year `2082` → **Generate**
5. Report shows:
   - Executive summary with override rate, appeal count, grievance resolution %
   - System integrity (re-verified live)
   - Workforce distribution by ministry and tier
   - All transfer windows for the year
6. Browser's **Print / Save PDF** → clean printable (nav hidden via `@media print`)

---

## 7. API reference

All routes return JSON. Auth headers: `Authorization: Bearer <token>`.

### Auth

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/send-otp` | Candidate OTP request |
| POST | `/api/auth/verify-otp` | OTP → JWT |
| GET | `/api/auth/me` | Current candidate |
| POST | `/api/admin-auth/login` | Admin password → JWT |
| GET | `/api/admin-auth/me` | Current admin |

### Phase 1-2

| Method | Path | Role |
|--------|------|------|
| GET | `/api/nid/:nid` | any |
| POST | `/api/exam-register` | candidate |
| GET | `/api/posts` | public |
| POST | `/api/application/submit` | candidate |
| GET | `/api/application/my-applications?nidNumber=X` | candidate |
| GET | `/api/results/:rollNumber` | public |
| GET | `/api/results/by-nid/:nid` | candidate (own) |
| GET `POST` | `/api/ministry/sections` | ministry/psc |
| POST | `/api/ministry/sections/:id/lock` | ministry |

### Phase 3

| Method | Path | Role |
|--------|------|------|
| GET | `/api/psc-admin/stats` | psc-admin |
| GET | `/api/psc-admin/applications` | psc-admin |
| POST | `/api/psc-admin/score` | psc-admin |
| POST | `/api/psc-admin/publish-merit-list` | psc-admin |
| GET | `/api/merit-list` | public |
| POST `GET` | `/api/grievances` | public / psc-admin |
| GET | `/api/grievances/mine/:nid` | any |
| PATCH | `/api/grievances/:id` | psc-admin |

### Phase 4

| Method | Path | Role |
|--------|------|------|
| GET | `/api/priority/ministries` | public |
| GET `POST` | `/api/priority/mine`, `/api/priority/submit` | candidate |
| POST | `/api/placement/{run,publish,reset}` | psc-admin |
| GET | `/api/placement/orders`, `/api/placement/public` | psc-admin / public |

### Phase 5-6

| Method | Path | Role |
|--------|------|------|
| GET | `/api/officer/{me,all,:nid,stats/summary}` | candidate / admin |
| GET | `/api/tenure/{districts,rules}` | public |
| POST | `/api/tenure/scan` | mofaga/psc |
| GET | `/api/tenure/queue`, `/api/tenure/queue/stats` | mofaga/psc |
| PATCH | `/api/tenure/officer/:nid/tier` | mofaga |

### Phase 7

| Method | Path | Role |
|--------|------|------|
| POST | `/api/score/run` | mofaga/psc |
| GET | `/api/score/rankings`, `/api/score/weights` | mofaga/psc / public |
| GET | `/api/score/officer/:nid` | self/admin |
| POST `GET` | `/api/appraisals` | ministry/mofaga/psc |
| POST | `/api/appraisals/:id/countersign` | mofaga/psc |
| GET | `/api/appraisals/anomalies` | mofaga/psc/watchdog |
| POST `GET` | `/api/exemptions` | officer / admin |
| PATCH | `/api/exemptions/:id` | mofaga/psc |

### Phase 8

| Method | Path | Role |
|--------|------|------|
| POST | `/api/transfer-window` | mofaga/psc |
| GET | `/api/transfer-window`, `/api/transfer-window/:id` | any auth |
| POST | `/api/transfer-window/:id/advance` | mofaga/psc |
| POST | `/api/transfer-window/appeals/submit` | officer |
| GET | `/api/transfer-window/appeals/mine` | officer |
| PATCH | `/api/transfer-window/appeals/:id` | mofaga/psc |
| POST | `/api/transfer-window/orders/:id/confirm` | ministry/mofaga/psc |
| GET | `/api/transfer-window/orders/mine` | officer |

### Phase 9

| Method | Path | Role |
|--------|------|------|
| POST | `/api/audit/override/:orderId` | secretary/mofaga/psc |
| POST | `/api/audit/override/:orderId/countersign` | mofaga/psc |
| GET | `/api/audit/{log,verify,stats,alerts}` | watchdog |
| PATCH | `/api/audit/alerts/:id` | watchdog/mofaga/psc |
| GET | **`/api/audit/public/dashboard`** | public |

### Phase 10

| Method | Path | Role |
|--------|------|------|
| POST | `/api/anti-gaming/check-return-block` | mofaga/psc |
| POST | `/api/anti-gaming/enforce-exemption-renewal` | mofaga/psc |
| GET | `/api/anti-gaming/exemption-patterns` | watchdog |
| POST | `/api/anti-gaming/emergency` | mofaga/psc |
| POST | `/api/anti-gaming/emergency/:id/{approve,reject,publish}` | psc / mofaga |
| GET | **`/api/anti-gaming/annual-report?year=2082`** | public |

---

## 8. Data model

23 collections organized by phase:

**PSC (Phases 1–4):** NID · ExamRegister · Candidate · Post · Application · Result · AdminUser · MinistrySection · Grievance · Priority · PlacementOrder

**HRMIS bridge (Phase 5):** Officer with embedded `postingHistory[]`

**MoFAGA (Phases 6–8):** DistrictTier · TransferQueue · Appraisal · Exemption · TransferScore · TransferWindow · TransferOrder · Appeal

**Integrity (Phases 9–10):** AuditEntry (SHA-256 hash-chained) · CiaaAlert · EmergencyTransfer

**One data backbone. Two systems. Zero manual re-entry.** When a placement is published, an `Officer` record is auto-created from the candidate's NID + ExamRegister + placement details. From day one, the same profile feeds the scoring engine.

---

## 9. Security model

### Authentication
- **Candidates:** NID + 6-digit OTP (5-min TTL-indexed in Mongo)
- **Admins:** NID + bcrypt password (10 rounds)
- **Session:** JWT HS256, 24-hour expiry

### Authorization (RBAC)
- 7 roles: `candidate`, `ministry-secretary`, `psc-admin`, `mofaga-admin`, `ciaa-auditor`, `oag-auditor`, `chief-secretary`
- `requireRole()` middleware on every admin endpoint
- Ministry secretaries auto-scoped to own ministry
- Officer self-service endpoints verify caller NID = requested NID

### Cryptographic integrity
- **Placement orders:** SHA-256 of `orderNumber|nid|sectionId|timestamp`
- **Transfer orders:** SHA-256 at issuance (T-10)
- **Emergency transfers:** SHA-256 at publish
- **Audit log:** canonical-JSON SHA-256 hash chain with `previousHash` linking every entry. Tampering with any entry breaks every subsequent hash. Detected by `GET /api/audit/verify`.

---

## 10. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `MongoServerError: bad auth` | Wrong MONGODB_URI | Verify user/password, URL-encode special chars |
| CORS error | Origin not allowed | Set `CLIENT_ORIGIN` in `server/.env` |
| `Invalid credentials` at admin login | Seed not run | `npm run seed` |
| OTP not received | Dev mode — OTP to console only | Check server terminal |
| "No passed candidates" (placement) | Merit list not published | Publish for at least one post |
| "Transfer queue empty" (scoring) | Tenure scan not run | MoFAGA → Run Tenure Scan |
| Window advance "Invalid transition" | Skipping states | One step at a time: scheduled → T-60 → T-30 → T-15 → T-10 → T-0 → closed |
| T-10 advance "No-gap rule" 409 | Orders need ministry confirmation | Pass `autoConfirm:true` or confirm individually |
| Emergency "Approval expired" | 24-hour window elapsed | Re-submit |
| Chain verify shows `brokenAt` | DB tampered or mid-seed | `npm run seed` regenerates clean chain |

---

## 11. Vercel Deployment — Step-by-step

> Deploy as **two separate Vercel projects**: one for `server/`, one for `client/`.  
> Architecture after deploy: `client.vercel.app` → `server.vercel.app/api` → MongoDB Atlas

---

### Prerequisites

- [Vercel account](https://vercel.com) (free tier is sufficient)
- [MongoDB Atlas](https://cloud.mongodb.com) cluster (free M0 tier works)
- GitHub repo containing this codebase (`client/` + `server/` in the root)

---

### Step 1 — MongoDB Atlas

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. **Database Access** → Add user → note the username and password
3. **Network Access** → Add IP → **`0.0.0.0/0`** (allow all — required for Vercel's dynamic IPs)
4. **Connect** → Drivers → copy the connection string:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/ndhrms?retryWrites=true&w=majority
   ```
   URL-encode any special characters in the password (e.g. `@` → `%40`, `#` → `%23`).

---

### Step 2 — Push to GitHub

```bash
git add .
git commit -m "chore: vercel deployment config"
git push
```

---

### Step 3 — Deploy the SERVER

1. Go to [vercel.com/new](https://vercel.com/new) → **Import** your GitHub repo
2. Set **Root Directory** → `server`
3. **Framework Preset** → Other
4. **Build Command** → *(leave empty)*
5. **Output Directory** → *(leave empty)*
6. **Environment Variables** — add all of the following:

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/ndhrms?retryWrites=true&w=majority` |
| `JWT_SECRET` | Generate with `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | `24h` |
| `NODE_ENV` | `production` |
| `CLIENT_ORIGIN` | *(set after client deploy — see Step 5)* |

7. Click **Deploy** → wait for green ✅
8. Copy your server URL, e.g. `https://ndhrms-server.vercel.app`
9. **Verify**: open `https://ndhrms-server.vercel.app/health` → should return `{ "status": "ok" }`

---

### Step 4 — Seed the database

Run seed once against your Atlas cluster from your local machine:

```bash
cd server
# Temporarily set MONGODB_URI to your Atlas connection string:
$env:MONGODB_URI="mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/ndhrms?..."
npm run seed
```

> Or add `MONGODB_URI` to your local `server/.env` and run `npm run seed` normally.

---

### Step 5 — Deploy the CLIENT

1. Go to [vercel.com/new](https://vercel.com/new) → **Import** the same GitHub repo
2. Set **Root Directory** → `client`
3. **Framework Preset** → Vite
4. **Environment Variables**:

| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | `https://ndhrms-server.vercel.app/api` *(your server URL from Step 3)* |

5. Click **Deploy** → wait for green ✅
6. Copy your client URL, e.g. `https://ndhrms-client.vercel.app`

---

### Step 6 — Link CORS back to the server

1. In Vercel → your **server project** → **Settings → Environment Variables**
2. Add / update:

| Variable | Value |
|----------|-------|
| `CLIENT_ORIGIN` | `https://ndhrms-client.vercel.app` |

3. Go to **Deployments** → **⋯ → Redeploy** (select latest deployment)

---

### Step 7 — Verify end-to-end

| Test | Expected result |
|------|-----------------|
| `https://ndhrms-server.vercel.app/health` | `{ "status": "ok", "dbConnection": "connected" }` |
| Open client URL → `/login` | App loads, no console errors |
| Enter any NID on `/login` | NidLookup badge resolves (API is reachable) |
| Refresh on `/login` | No 404 (SPA rewrite works) |
| Login as PSC admin `999-999-9999` / `admin123` | Dashboard appears |

---

### Redeploying after code changes

Vercel auto-deploys on every `git push` to `main`:

```bash
git add .
git commit -m "your changes"
git push
```

To update environment variables without a code change:  
Vercel Dashboard → Project → Settings → Environment Variables → edit → **Redeploy**.

---

### Vercel deployment — production hardening still needed

This is a **reference implementation**. Before deploying against real civil-service data:

- [ ] Replace simulated DSC with X.509 PKI bound to Nepal Government NID
- [ ] Wire licensed SMS gateway (NTC/NCell) for real OTP dispatch
- [ ] MongoDB with TLS + auth + replica set + managed backups
- [ ] Rotate JWT secret regularly; consider short tokens + refresh
- [ ] Rate-limit auth endpoints (`express-rate-limit`)
- [ ] CSRF protection if switching to cookies
- [ ] WAF in front of the client (Cloudflare recommended)
- [ ] Audit log retention on WORM storage
- [ ] Scale for 40k officers: shard by ministry, BullMQ worker queue for scoring
- [ ] Observability: Prometheus metrics, OpenTelemetry traces, structured logs (pino)

---

## 12. Known limitations

Deliberate scope cuts (documented honestly per spec §9 open questions):

- **AI-proctored exam + face recognition** — modeled as score entry; no actual proctoring
- **SMS dispatch** — console log in dev; production needs licensed carrier
- **Appraisal ML anomaly detection** — stdev-based flag only (no ML)
- **Province-level officer coordination** — spec Question #4 open; only federal ministries
- **International deputation** — spec Question #2 open
- **Informal tenure extension auto-order at 100%** — flagged at 90%, doesn't auto-draft
- **Live National Health Registry verification** — simulated with manual verify/reject

---

## 13. Credits & License

**Developed by RaaZ Khanal**

- GitHub: [@raazkhnl](https://github.com/raazkhnl)
- Email: [raazkhnl@gmail.com](mailto:raazkhnl@gmail.com)

**Specification**: Nepal Government Digital HR Management System — Complete Integrated Reference (PSC + MoFAGA, April 2026)

**License**: MIT — see [LICENSE](./LICENSE) for full text including deployment notice.

Reference implementation only. Use as a starting point for your pilot deployment. Complete a full security review and production hardening checklist (§11) before using against real civil-service data.

---

*NDHRMS v3 · Government of Nepal · 2026*
