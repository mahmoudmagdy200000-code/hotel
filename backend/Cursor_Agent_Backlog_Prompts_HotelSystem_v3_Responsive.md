# Cursor Agent Playbook (v2) — Hotel Reservation System (.NET Clean Architecture + React)

This is a **prompt-driven backlog** designed for Cursor/AI agents.
It includes:
- **Persistent instructions** (must-follow)
- **One prompt per feature** (backend + frontend)
- **Acceptance Criteria** + **Definition of Done**

---

## What’s New in v2 (added based on brainstorming)
- Owner-first features: **daily automated owner report**, stronger **financial KPIs**, **source analytics**, **cancellations/no-show**, **activity log**.
- Operational polish: **Print/Export**, **message templates**, **PWA kiosk mode** for reception.
- Reservation flow completeness: **unassigned reservations**, **room assignment**, **conflict prevention**.
- PDF intake hardened: **attach original PDF to reservation**, support **multiple templates**, confidence scoring.
- Non-functional best practices: **seed data**, **backups**, **monitoring/logging**, **security hardening**, **CI checks**.

---

## 0) Persistent Instructions (ALWAYS FOLLOW)

### Architecture & Code Quality Rules
1) **Clean Architecture boundaries**:
   - **Domain**: Entities, enums, value objects, domain rules (NO EF, NO HTTP).
   - **Application**: CQRS handlers, DTOs, interfaces, validation, business rules.
   - **Infrastructure**: EF Core, external services, file storage, repositories.
   - **Web/API**: Controllers, auth, middleware, request/response mapping.
2) **No business logic in controllers**.
3) **CQRS**: Commands for writes, Queries for reads.
4) **Validation**: FluentValidation (or project standard). Validate at edge.
5) **Consistency**:
   - Centralized error handling (ProblemDetails)
   - Consistent DTOs (never return EF entities)
6) **Security**:
   - JWT auth + refresh tokens (if template supports)
   - Role/Policy authorization
   - CORS configured explicitly
   - Rate limiting for auth endpoints (if easy)
7) **Data rules**:
   - Prevent room overlap (conflict detection)
   - Status transitions enforced in Application
8) **Testing (minimum)**:
   - Unit tests for PDF parsing + conflict rules + status transitions
9) **Clean code**:
   - Small methods/classes
   - DRY, SRP
   - Meaningful names
   - No magic strings (use constants/enums)
10) **Delivery discipline**:
   - Feature done end-to-end, build passes, migrations applied.

### Output Rules for the Agent
- Provide **only code changes**.
- Create new files in correct layer.
- Keep endpoints RESTful.
- Update Swagger/OpenAPI docs if used.

---

## 1) Run-Once Setup Prompts

### Prompt 1.1 — Verify Template & Run
**Prompt:**
> Inspect the repo structure and confirm it follows Clean Architecture. Configure local DB connection (follow existing appsettings pattern). Run migrations. Ensure Swagger loads and a health endpoint returns 200. Do not change architecture.

**Acceptance Criteria:**
- API runs
- Swagger reachable
- DB created + migrations applied

### Prompt 1.2 — Seed Demo Data (Rooms + Sample Reservations)
**Prompt:**
> Add a safe seed mechanism (dev only) to populate: 3 room types, 10 rooms, and 10 sample reservations across different statuses. Ensure seed can be toggled via configuration.

**Acceptance Criteria:**
- Dev environment can seed data
- Production seed is off by default

---

## 2) Auth + Roles

### Prompt 2.1 — Roles & Policies (Owner / Reception / Admin)
**Prompt:**
> Implement roles Owner, Reception, Admin. Seed roles (and optionally demo users). Add policies. Protect endpoints accordingly. Add a minimal endpoint to return current user profile + roles.

**Acceptance Criteria:**
- Roles exist
- Protected endpoint blocks wrong roles

---

## 3) Hotel Setup (Rooms)

### Prompt 3.1 — Room Types CRUD
**Prompt:**
> Implement RoomType entity and CRUD via CQRS. Fields: Name (unique), Capacity (>0), DefaultRate (>=0), IsActive. Add migration, DTOs, validators, handlers, and endpoints.

### Prompt 3.2 — Rooms CRUD
**Prompt:**
> Implement Room entity and CRUD. Fields: RoomNumber (unique), RoomTypeId, Floor (optional), Status (Available/OutOfService), IsActive. Add filters (active/status/type).

**Acceptance Criteria (Rooms):**
- Unique RoomNumber
- Filter endpoints work

---

## 4) Reservations (Core)

### Prompt 4.1 — Reservation Entity + CRUD
**Prompt:**
> Implement Reservation entity and CRUD via CQRS. Fields:
> Source (Manual/PDF/WhatsApp/Booking), BookingNumber (optional), GuestName, GuestPhone (optional), Nationality (optional),
> CheckInDate, CheckOutDate, Adults (>=1), Children (>=0),
> RoomId (nullable), RoomTypeId (nullable),
> TotalAmount (>=0), Currency (3-letter code), Status,
> Notes.
> Validate: CheckOutDate > CheckInDate.

### Prompt 4.2 — Status Transitions (Business Rules)
**Prompt:**
> Implement status transitions with rules:
> - CheckedOut terminal
> - NoShow terminal
> - Cancelled cannot move to CheckedIn/CheckedOut
> - CheckedIn requires Confirmed (or auto-confirm first)
> Keep rules in Application layer.

### Prompt 4.3 — Room Assignment to Reservation
**Prompt:**
> Add command/endpoint to assign/unassign a RoomId to a reservation. Enforce overlap rules. Return friendly errors. Update reservation details DTO to include assigned room and derived availability info.

**Acceptance Criteria:**
- CRUD works
- Status rules enforced
- Room assignment works

---

## 5) Reception Workflow

### Prompt 5.1 — Reception Today View
**Prompt:**
> Implement GET /api/reception/today?date=YYYY-MM-DD returning arrivals, departures, inHouse + summary counts. Authorize Reception/Admin.

### Prompt 5.2 — Quick Actions
**Prompt:**
> Implement quick action endpoints (checkin/checkout/noshow/cancel) using status transition rules.

### Prompt 5.3 — Print Check-in List
**Prompt:**
> Add endpoint to generate a printable daily list (JSON for frontend print or server-side PDF later). Include guest name, room, dates, booking number, phone.

**Acceptance Criteria:**
- Reception can run a full day from Today View
- Print list works

---

## 6) Availability Calendar (Per Room)

### Prompt 6.1 — Availability API
**Prompt:**
> Implement GET /api/availability?start&end for FullCalendar resource timeline:
> resources: rooms (id, title)
> events: reservations with RoomId (id, resourceId, start, end, title)
> unassigned: reservations without RoomId.

### Prompt 6.2 — Conflict Detection
**Prompt:**
> Prevent overlapping reservations per room (statuses excluded: Cancelled, NoShow). Implement helper query in Application. Return clear error.

### Prompt 6.3 — Availability Matrix (Owner-friendly)
**Prompt:**
> Add an owner-friendly endpoint that returns per-room availability summary (available/booked blocks) for a date range. Keep payload small and chart-ready.

---

## 7) PDF Upload → Extract → Review → Save

### Prompt 7.1 — PDF Parse Endpoint (with Confidence)
**Prompt:**
> Implement POST /api/pdf-reservations/parse (multipart file). Use UglyToad.PdfPig to extract text. Parse Booking-style fields: booking number, guest name, check-in/out, total price + currency, nationality/country if present.
> Return ExtractedReservationDto: fields + confidence (0..1) + raw text.
> Add unit tests for parsing using sample extracted text.

### Prompt 7.2 — Store PDF Attachment
**Prompt:**
> Add infrastructure for storing uploaded PDFs (local folder in dev; pluggable interface for S3 later). Save file metadata and link it to Reservation.

### Prompt 7.3 — Create Reservation from Extracted Data
**Prompt:**
> Implement POST /api/pdf-reservations/create-from-extracted accepting extracted data + overrides. Create Reservation (Source=PDF, Status=New). Persist attachment link.

### Prompt 7.4 — Multi-Template Parsing Strategy
**Prompt:**
> Refactor parsing into strategy classes (per template/source). Add a simple template detector based on keywords. Keep it extensible.

**Acceptance Criteria:**
- Upload PDF returns extracted fields
- User can confirm & save
- PDF stored and linked

---

## 8) Owner Dashboard (The “Sales” Features)

### Prompt 8.1 — Owner KPI Dashboard
**Prompt:**
> Implement GET /api/owner/dashboard?start&end. Return:
> TodayRevenue, MonthRevenue, OccupancyRate,
> CheckinsToday, CheckoutsToday,
> ADR, RevPAR,
> BookingSources breakdown.
> Ensure calculations are correct and documented.

### Prompt 8.2 — Daily Automated Owner Report
**Prompt:**
> Implement a daily summary generator (service) that compiles: revenue, occupancy, arrivals, departures, cancellations, no-shows. Provide endpoint to preview the report. Keep sending mechanism abstract (Email/WhatsApp later).

### Prompt 8.3 — Cancellations & No-Show Analytics
**Prompt:**
> Add endpoints to aggregate cancellations/no-shows by date range and source. Return chart-friendly DTOs.

---

## 9) Reports + Export

### Prompt 9.1 — Revenue Report (Daily Totals)
**Prompt:**
> Implement GET /api/reports/revenue?start&end returning daily totals array for charting.

### Prompt 9.2 — Occupancy Report (Daily)
**Prompt:**
> Implement GET /api/reports/occupancy?start&end returning daily occupancy percentage.

### Prompt 9.3 — Export CSV/Excel (Server or Client)
**Prompt:**
> Add an export endpoint for reservations list (filtered). Output CSV. Keep it efficient.

---

## 10) Activity Log (Transparency)

### Prompt 10.1 — Activity Logging
**Prompt:**
> Implement ActivityLog for reservation actions (create/update/status/assign room). Store user, action, entityId, timestamp, minimal before/after JSON. Add GET /api/activity with filters. Owner/Admin read-only.

---

## 11) Frontend (React TypeScript) Prompts

### Persistent Frontend Rules
- TypeScript everywhere
- Pages thin; API calls in services
- Central auth (token + role)
- Consistent UI (template system)
- Prefer React Query (or the project’s standard) for caching

### Responsive & Mobile UX Rules (MANDATORY)
- The app must be **fully responsive** on **mobile / tablet / desktop**.
- Use a **mobile-first** approach and avoid fixed widths.
- Dashboard cards must wrap into 1 column on mobile, 2 on tablet, 3+ on desktop.
- Tables must be responsive: on mobile use **stacked rows / cards** or horizontal scroll with sticky key columns.
- Calendar must have a **mobile mode** (day list or agenda view) when screen is small.
- Reception Today must be **one-thumb friendly**: large buttons, minimal clicks.
- Verify common breakpoints at minimum: **360px, 768px, 1024px**.

### Prompt F1 — App Shell + Role-based Navigation
**Prompt:**
> Build app shell with routes: Owner Dashboard, Reception Today, Reservations, Reservation Details, Add Reservation, Calendar, Rooms, Room Types, Reports, Activity, Settings. Implement role-based nav + route guards. Integrate JWT.

**Acceptance Criteria (Responsive):**
- Sidebar collapses to drawer on mobile
- Main content fits without horizontal scrolling at 360px



### Prompt F2 — Reservations List + Filters
**Prompt:**
> Build reservations table with filters (status/date/source), search (guest/booking number), pagination, and status badges.

**Acceptance Criteria (Responsive):**
- On mobile, reservations render as cards or a responsive table without breaking layout
- Filters usable on mobile (drawer or stacked controls)



### Prompt F3 — Reservation Details + Actions
**Prompt:**
> Build details page with status actions (confirm/checkin/checkout/cancel/noshow), room assignment, and attachment view/download for PDF.

**Acceptance Criteria (Responsive):**
- Actions are reachable without precision tapping on mobile
- Details layout stacks cleanly on small screens



### Prompt F4 — Reception Today
**Prompt:**
> Build Reception Today with tabs (Arrivals/Departures/InHouse), quick actions, and a print-friendly view.

**Acceptance Criteria (Responsive):**
- Large buttons and minimal scrolling on mobile
- Lists readable and tappable at 360px



### Prompt F5 — Calendar (Per Room)
**Prompt:**
> Implement FullCalendar resource timeline (rooms). Show bookings blocks. Clicking opens details drawer. Show unassigned reservations in a side panel.

**Acceptance Criteria (Responsive):**
- Provide a mobile-friendly view (agenda/day list) for small screens
- Calendar remains usable on tablet and desktop



### Prompt F6 — Add Reservation (PDF → Review)
**Prompt:**
> Implement Add Reservation flow:
> 1) Upload PDF → parse
> 2) Review form with confidence indicators
> 3) Confirm & Save

**Acceptance Criteria (Responsive):**
- Upload + Review form works smoothly on mobile
- Form fields stack and remain readable



### Prompt F7 — Owner Dashboard + Charts
**Prompt:**
> Build KPI cards + charts using owner dashboard + report endpoints. Make it mobile-friendly.

**Acceptance Criteria (Responsive):**
- KPI cards wrap to 1 column on mobile, 2 on tablet
- Charts resize correctly and remain readable



### Prompt F8 — PWA Kiosk Mode (Optional but recommended)
**Prompt:**
> Add PWA support so Reception can install the web app on a PC/tablet, open full screen, and stay logged in (securely). Add a kiosk-friendly theme toggle.

---

## 12) Production Hardening

### Prompt P1 — Global Error Handling + Validation Mapping
**Prompt:**
> Ensure global exception middleware returns consistent ProblemDetails. Map validation errors clearly for frontend.

### Prompt P2 — Backups + Monitoring Basics
**Prompt:**
> Add minimal operational docs: scheduled DB backups (script), log rotation, health checks endpoint, and basic monitoring notes (uptime/alerts).

### Prompt P3 — Docker Compose
**Prompt:**
> Add Docker compose (API + DB). Add README steps. Use env vars.

---

## 13) Definition of Done (EVERY feature)
- API builds and runs
- Frontend builds and runs
- Migrations applied (if schema changed)
- Swagger updated
- Validation + authorization applied
- DTOs only over the wire
- Tested: happy path + one failure path
- **Responsive verified** at 360px / 768px / 1024px for any UI delivered
- **Mobile UX**: key flows work on phone (Login, Reception Today, Add Reservation, Dashboard)

---

## 14) Suggested Execution Order (Fastest MVP)
1) Setup + Auth
2) Room Types + Rooms
3) Reservations CRUD + transitions + assign room
4) Reception Today + quick actions + print list
5) Availability calendar + conflicts + unassigned
6) PDF parse + review + create + attach
7) Owner KPIs + daily report preview
8) Reports + Activity log
9) Hardening + deploy

