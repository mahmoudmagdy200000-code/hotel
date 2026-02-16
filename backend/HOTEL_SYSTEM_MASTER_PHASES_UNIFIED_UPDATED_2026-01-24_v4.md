# Hotel Reservation System — Master Backlog & Phased Plan (Unified Terms)
_Last updated: 2026-01-24_

> الهدف من الملف: توحيد المصطلحات والترقيم بين ملف الـ Backlog Prompts وملف “Last Stop / Next Step”، بحيث يبقى عندك مرجع واحد مرتب للمراحل + آخر نقطة وصلنا لها + الخطوة اللي بعدها.

---

## Glossary (مصطلحات ثابتة)
- **Phase (مرحلة):** مجموعة Features كبيرة (مثال: Hotel Setup, Reservations).
- **Sub-Phase (خطوة فرعية):** Feature محددة داخل المرحلة (مثال: Room Types CRUD).
- **Agent Prompt:** نص جاهز تبعته للـ Cursor/AI Agent لتنفيذ Sub-Phase.

> من هنا ورايح هنستخدم **Phase / Sub-Phase** فقط (مش “Prompt 3.1” في الكلام اليومي).  
> لكن هنحافظ على رقم الـ Prompt الأصلي بين قوسين كمرجع.

## Project Status (آخر وضع + الخطوة الجاية)
- **Last completed:** Phase 5.3 — Reception Reservation Search ✅ (Passed)
- **Current focus (Next):** **Phase 5.4 — Reservation Search Refinement / Next in Plan**
- **Quick verify commands:** `dotnet build` ثم `dotnet test`

---

## Global Decisions (قرارات مقفولة لازم تتطبق في كل الشغل)
1) **Backend-only Development Mode** خلال أول مراحل الباك:  
   - خلي التشغيل يوجّه `/` إلى Swagger أو صفحة بسيطة، وخلّي كل API تحت `/api/*`.  
   - ما تعملش SPA fallback أثناء الباك فقط (علشان ما يبوّظش الـ routing).  
2) **ReservationLines إلزامي**: الحجز ممكن يحتوي أكتر من غرفة، وممكن أنواع غرف مختلفة في نفس الحجز.  
3) **Revenue by stay nights**: الإيراد بيتحسب على عدد ليالي الإقامة (توزيع إجمالي المبلغ على الليالي).  
4) **Forecast**: لازم يبقى عندنا وضعين:
   - **Actual** = حجوزات مؤكدة/مكتملة/نشطة.
   - **Forecast** = يشمل حجوزات مؤكدة + Pending (حسب قواعد الاستبعاد/الإدخال المذكورة لاحقًا).
5) **Roles (لما نوصل للأوث)**: Owner / Reception / Admin مع قواعد الوصول المذكورة في Phase 2.

---

## Quality & Architecture Rules (مختصر)
- Clean Architecture + CQRS/Handlers + Validation + Mapping + Repository/UnitOfWork حسب التمبليت.
- DTOs واضحة، وEndpoints منظمة، وSwagger مرتب.
- Seeding data موجود علشان نقدر نختبر من غير بيانات حقيقية.

---

# Current Status Snapshot (آخر نقطة وصلنا لها)
## ✅ Environment
- .NET SDK: **10.0.102**
- Swagger شغال
- EF + SQLite `app.db` شغال
- Seed data شغال

## ✅ Done
- Project setup + template verification
- Domain entities + EF mappings
- SQLite + migrations
- Seeding (Rooms + Sample Reservations)

## 🔄 In Progress (اللي شغالين عليه دلوقتي)
- **Phase 3 — Hotel Setup / Rooms**
  - **Sub-Phase 3.1: Room Types CRUD** (كان مكتوب في handoff “Phase 4” — تم تصحيحه هنا)

## ➜ Next Immediately (الخطوة الجاية)
- **Phase 4 — Reservations**
  - ✅ **Sub-Phase 4.0:** ReservationLines (Schema-first / Multi-room) — Completed
  - ✅ **Sub-Phase 4.1:** Status Management + Edit Rules (Draft non-blocking) — Completed
  - ✅ **Sub-Phase 4.2:** Financials & Price Breakdown (Revenue per stay night + line/night breakdown) — Completed
  - ✅ **Sub-Phase 4.3:** Occupancy & Forecast (Read Models) — Completed
  - ✅ **Sub-Phase 4.4:** Dashboard KPIs (ADR / RevPAR / Trends) — Completed

---

# Phased Plan (المراحل مرتبة)

## Phase 1 — Run-Once Setup (Prompts 1.x)
### Sub-Phase 1.1 (Prompt 1.1) — Verify Template & Run
**Deliverables**
- Project builds, runs, Swagger OK
- `/api` routing working

### Sub-Phase 1.2 (Prompt 1.2) — Seed Demo Data
**Deliverables**
- Seed: RoomTypes, Rooms, sample Reservations
- Repeatable seed (idempotent)

---

## Phase 2 — Auth + Roles (Prompts 2.x)
### Sub-Phase 2.1 (Prompt 2.1) — Roles & Policies
**Roles**
- Owner / Reception / Admin
**Deliverables**
- Policies + endpoint protection + role-based visibility rules

---

## Phase 3 — Hotel Setup (Rooms) (Prompts 3.x)

### Sub-Phase 3.1 (Prompt 3.1) — Room Types CRUD ✅ Completed
**What was delivered**
- **Application (CQRS):**
  - DTO: `RoomTypeDto` + AutoMapper mapping
  - Commands: `CreateRoomTypeCommand` (unique name), `UpdateRoomTypeCommand` (exists + valid name), `DeleteRoomTypeCommand` (blocked if linked Rooms)
  - Queries: `GetRoomTypesQuery` (optional `isActive` filter), `GetRoomTypeByIdQuery`
  - Validation (FluentValidation): Name required/max 100, Capacity > 0, DefaultRate ≥ 0
- **Web:**
  - `src/Web/Endpoints/RoomTypes.cs`
  - Endpoints (all `[Authorize]`):  
    `GET /api/roomtypes` • `GET /api/roomtypes/{id}` • `POST /api/roomtypes` • `PUT /api/roomtypes/{id}` • `DELETE /api/roomtypes/{id}`
  - TypedResults with correct HTTP codes (200/201/204/400/404) + 401 when unauthenticated
- **Fixes/Enhancements:**
  - Fixed `GlobalUsings` in Application
  - Resolved `NotFoundException` conflict (project vs Ardalis)
  - Updated uniqueness to be **case-insensitive**
  - Updated `CustomExceptionHandler` to map `InvalidOperationException` → **400 Bad Request** (business rule failures)
  - Removed old Todo tests that blocked build
- **Verification:**
  - Integration Tests: **12 passed** (Fake auth via `TestAuthHandler`)
  - Report: `TEST_REPORT_ROOMTYPES.md`
  - Build: success; Swagger shows schemas

---

### Sub-Phase 3.2 (Prompt 3.2) — Rooms CRUD ✅ Completed
**What was delivered**
- **Application (CQRS):**
  - DTO: `RoomDto` (includes `RoomTypeName` for display)
  - Commands:
    - `CreateRoomCommand` (unique RoomNumber **case-insensitive**, RoomTypeId must exist)
    - `UpdateRoomCommand` (update data + status/`IsActive`)
    - `DeleteRoomCommand` (blocked if room has **any reservations** to preserve history)
  - Queries:
    - `GetRoomsQuery` (filters: `roomTypeId`, `isActive`, and search by room number)
    - `GetRoomByIdQuery`
- **Web:**
  - `src/Web/Endpoints/Rooms.cs`
  - Endpoints (all `[Authorize]`):  
    `GET /api/rooms` • `GET /api/rooms/{id}` • `POST /api/rooms` • `PUT /api/rooms/{id}` • `DELETE /api/rooms/{id}`
  - `CustomExceptionHandler` updated to return clear **400 Bad Request** messages on delete rule violations
- **Verification:**
  - Integration Tests: **10 passed**
  - Report: `TEST_REPORT_ROOMS.md`
  - Build: success; Swagger updated

**Exit criteria**
- ✅ App + Tests build green
- ✅ Swagger shows endpoints + schemas
- ✅ Business rules enforced + covered by tests

---

## Phase 4 — Reservations (Core) (Prompts 4.x)
### Sub-Phase 4.0 (Prompt 4.0) — ReservationLines (Schema-first / Multi-room)
**Status:** ✅ Completed

**Summary**
- **Schema-first:** `Reservation` أصبح Header + إضافة `PaidAtArrival`.
- **New entity:** `ReservationLine` لتمثيل الغرف داخل الحجز (Multi-room) مع تخزين `RatePerNight` + `RoomType` snapshot وقت الحجز.
- **EF Core:** علاقة One-to-Many (Reservation → ReservationLines) + Cascade delete.
- **Migration:** `UpdateReservationSchema` created & applied.
- **Availability / Overlap:** منع الحجز المزدوج لنفس الغرفة في نفس التواريخ للحجوزات “النشطة” (Confirmed, CheckedIn, CheckedOut).
- **Commands:** `CreateReservationCommand`, `UpdateReservationCommand` (replace lines + re-check availability), `CancelReservationCommand` (sets status = Cancelled ويحرر الغرف).
- **Fixes:** حل تعارض `CheckInDate` vs `CheckIn()`، وتحديث منطق حذف الغرف ليفحص `ReservationLines`.

**Testing**
- ✅ Added **7** integration tests for reservations scenarios
- ✅ Total suite: **29 tests passed** (RoomTypes + Rooms + Reservations)
- ✅ Build succeeded
- Report: `TEST_REPORT_RESERVATIONS.md`

### Sub-Phase 4.1 (Prompt 4.1) — Status Management + Edit Rules (Advanced)
**Status:** ✅ Completed

**Summary**
- **Initial status:** changed from `New` to `Draft` and made **non-blocking** (multiple drafts can exist for the same room/date range).
- **Explicit transitions (Commands):**
  - `ConfirmReservationCommand`: `Draft → Confirmed` (**mandatory availability check**)
  - `CheckInReservationCommand`: `Confirmed → CheckedIn`
  - `CheckOutReservationCommand`: `CheckedIn → CheckedOut`
  - `NoShowReservationCommand`: `Confirmed → NoShow` (frees room)
  - `CancelReservationCommand`: `Draft/Confirmed → Cancelled` (frees room)
- **Edit rules by status:**
  - `Draft` & `Confirmed`: full edit allowed (re-check availability when dates/lines change)
  - `CheckedIn`: allow guest info only (no dates/lines changes)
  - `CheckedOut` / `Cancelled` / `NoShow`: read-only
- **Audit fields:** added timestamps `ConfirmedAt`, `CheckedInAt`, `CheckedOutAt`, `CancelledAt`, `NoShowAt`
- **Migration:** `AddReservationAuditFields` created & applied.

**Testing**
- ✅ Added **7** integration tests for Draft policy, confirm availability, edit restrictions, and freeing availability on cancel/no-show.
- ✅ Total suite: **36 tests passed** (RoomTypes + Rooms + Reservations + Phase 4.1)
- ✅ Build succeeded
- Report: `TEST_REPORT_RESERVATIONS_PHASE41.md`

### Sub-Phase 4.2 (Prompt 4.2) — Financials & Price Breakdown (Revenue per stay night)
**Status:** ✅ Completed

**Summary**
- **Helpers:** `FinancialHelper` created for consistent server-side calculation of nights, line totals, and total amount.
- **Breakdown Query:** `GetReservationFinancialBreakdownQuery` provides nightly allocation and per-line details.
- **Revenue Summary:** `GetRevenueSummaryQuery` aggregates revenue by day or room type, allowing mode filtering (Actual/Forecast).
- **Nullable Parameters:** Query parameters handlers improved to support optional inputs with smart defaults.

**Testing**
- ✅ Added **4** integration tests verifying:
  - Deterministic breakdown (nights, totals, allocation).
  - Status filtering logic (Confirmed/CheckedIn included in Forecast).
  - Grouping by RoomType.
  - Authentication rules.
- ✅ Total suite: **46 tests passed**
- Report: `TEST_REPORT_FINANCIALS_PHASE42.md`

### Sub-Phase 4.3 (Prompt 4.3) — Occupancy & Forecast (Read Models)
**Status:** ✅ Completed

**Summary**
- **Read Models:** implemented `OccupancySummaryDto` and associated models for aggregated dashboard data.
- **Logic:** consistent stay-night counting (Check-in inclusive, Check-out exclusive).
- **Inclusion:** Actual (CheckedOut), Forecast (Confirmed+Active).
- **Supply:** active rooms based capacity tracking.

**Testing**
- ✅ Added **5** integration tests for stay-night allocation, mode filtering, status exclusion, and room type grouping.
- Report: `TEST_REPORT_OCCUPANCY_PHASE43.md`


### Sub-Phase 4.4 (Prompt 4.4) — Dashboard KPIs (ADR / RevPAR / Trends)
**Status:** ✅ Completed

**Summary**
- **Composition:** `GetDashboardQuery` implemented, orchestrating sub-queries for Occupancy and Revenue.
- **KPIs:** calculated ADR (Average Daily Rate) and RevPAR (Revenue Per Available Room) for range summaries and daily trends.
- **Granularity:** provides daily series points and optional RoomType breakdown logic.
- **Logic:** consistent with previous status-based inclusion policies and stay-night date semantics.

**Testing**
- ✅ Added **6** integration tests for smoke tests, accuracy, mode policy check, series alignment, and room type breakdown.
- ✅ Total suite: **51 functional tests passed**.
- Report: `TEST_REPORT_DASHBOARD_PHASE44.md`


---

## Phase 5 — Reception Workflow (Prompts 5.x)
### Sub-Phase 5.1 (Prompt 5.1) — Reception Today View ✅ Completed
**Deliverables**
- Endpoint: `GET /api/reception/today`
- Read Models: `ReceptionTodayDto` (Arrivals, Departures, InHouse)
- Logic: Status/Date based classification with deterministic ordering.
- Testing: 3 integration tests passed.
- Report: `TEST_REPORT_RECEPTION_TODAY_PHASE51.md`

### Sub-Phase 5.2 (Prompt 5.2) — Quick Actions ✅ Completed
**Deliverables**
- Endpoints:
  - `POST /api/reception/reservations/{id}/check-in`
  - `POST /api/reception/reservations/{id}/check-out`
  - `POST /api/reception/reservations/{id}/cancel`
  - `POST /api/reception/reservations/{id}/no-show`
- Logic: Strict transition rules (Confirmed -> Active/Terminal) and business date validation.
- DTOs: `ReservationStatusChangedDto`
- Testing: **7 integration tests passed**.
- Report: `TEST_REPORT_RECEPTION_ACTIONS_PHASE52.md`

### Sub-Phase 5.3 (Prompt 5.3) — Reception Reservation Search ✅ Completed
**Deliverables**
- Endpoint: `GET /api/reception/reservations/search`
- Logic: Multi-field search (BookingNumber, Name, Phone, ID) with date-based priority ordering.
- Testing: **7 integration tests passed**.
- Report: `TEST_REPORT_RECEPTION_SEARCH_PHASE53.md`

### Sub-Phase 5.4 — Print Check-in List (Deferred or Next)

---

## Phase 6 — Availability & Forecast (Prompts 6.x)
### Sub-Phase 6.1 (Prompt 6.1) — Availability API
### Sub-Phase 6.2 (Prompt 6.2) — Conflict Detection
### Sub-Phase 6.3 (Prompt 6.3) — Availability Matrix
### Sub-Phase 6.4 (Prompt 6.4) — Forecast Occupancy (By RoomType)
**Forecast inclusion rule (مختصر)**
- Exclude: Cancelled / NoShow
- Include in Actual: Confirmed / CheckedIn / CheckedOut
- Include in Forecast: Confirmed + Pending (لو قررنا) + … حسب القرار وقتها

### Sub-Phase 6.5 (Prompt 6.5) — Forecast Assignment Simulation (Optional)

---

## Phase 7 — PDF Upload → Extract → Review → Save (Prompts 7.x)
### Sub-Phase 7.1 (Prompt 7.1) — PDF Parse Endpoint (with Confidence)
### Sub-Phase 7.2 (Prompt 7.2) — Store PDF Attachment
### Sub-Phase 7.3 (Prompt 7.3) — Create Reservation from Extracted Data
### Sub-Phase 7.4 (Prompt 7.4) — Multi-Template Parsing Strategy

---

## Phase 8 — Owner Dashboard (Prompts 8.x)
### Sub-Phase 8.1 (Prompt 8.1) — KPI Dashboard (Revenue by Stay Nights)
### Sub-Phase 8.2 (Prompt 8.2) — Daily Automated Owner Report
### Sub-Phase 8.3 (Prompt 8.3) — Cancellations & No-Show Analytics

---

## Phase 9 — Reports + Export (Prompts 9.x)
- Exports (CSV/Excel) + report endpoints + filters

---

# Feature Result Drop-in Section (لما تبعت نتيجة الفيتشر)
> لما تخلص الفيتشر اللي شغال عليه، ابعتلي:
- **اسم المرحلة/الخطوة الفرعية**
- **الـ endpoints اللي اتعملت**
- **أي تغييرات في DB/migrations**
- **أي قرارات/ملحوظات جديدة**
- **Any TODOs**

## Latest Feature Result (Paste here)
- Phase:
- Sub-Phase:
- Endpoints:
- DB/Migrations:
- Notes:
- Remaining TODO:

---

# Next Step Checklist (جاهز للتنفيذ)
- [x] Sub-Phase 4.0 ReservationLines (schema-first) — ✅ completed
- [x] Sub-Phase 4.1 Reservation CRUD Advanced + Statuses groundwork — ✅ completed
- [x] Sub-Phase 4.2 Financials & Price Breakdown — ✅ completed
- [x] Sub-Phase 4.3 Occupancy & Forecast — ✅ completed
- [x] Sub-Phase 4.4 Dashboard KPIs — ✅ completed
- [x] Phase 5.1 Reception Today View — ✅ completed
- [x] Phase 5.2 Reception Quick Actions — ✅ completed
- [x] Phase 5.3 Reception Reservation Search — ✅ completed
- [ ] Move to Phase 5.4 — Print Check-in List (or next phase)
