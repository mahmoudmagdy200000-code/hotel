# HOTEL_SYSTEM_MASTER_PHASES_UNIFIED_UPDATED_2026-01-25_v6.md
> Cursor Rules — Hotel Backend (Clean Architecture + CQRS)  
> Timezone: Africa/Cairo (+02:00)  
> Repo mode: **Backend-only** (UI deferred until backend phases below are done)

---

## 0) GLOBAL RULES (MUST FOLLOW)
- **Clean Architecture boundaries:** Web → Application → Domain/Infrastructure
- **CQRS + MediatR:** Queries/Commands + Handlers only (no business logic in endpoints)
- **DTO-only responses** (no entities in API responses)
- **ProblemDetails** via `CustomExceptionHandler`
- All endpoints are **[Authorize]**
- Smallest-change refactoring only
- No background jobs/caching unless a phase explicitly adds it
- No new database tables unless a phase explicitly says so

---

## 1) CURRENT STATUS
**Last Completed**
- ✅ Phase 5.3 — Reception Reservation Search / Quick Lookup
- ✅ Phase 6 — PDF Upload + OCR Parsing → Draft Reservation + Pending Queue + Confirmation Workflow

**Now Starting**
- ▶️ **FRONTEND INTEGRATION** (Backend readiness achieved)

**Frontend**
- **Unlocked**: Phase 6 is complete and stable. You may now proceed with Frontend integration.

---

## 2) COMPLETED PHASES (RECENT — VERIFIED)

### ✅ Phase 4.2 — Financials (Already implemented)
**Endpoints**
- `GET /api/financials/revenue?from&to&mode&groupBy=Day|RoomType`
- `GET /api/reservations/{id}/breakdown`

**Inclusion policy**
- Actual revenue: `CheckedOut` only
- Forecast revenue: `Confirmed + CheckedIn + CheckedOut`
- Always exclude: `Draft/Cancelled/NoShow`

---

### ✅ Phase 4.3 — Occupancy (Already implemented)
**Endpoint**
- `GET /api/occupancy?from&to&mode&groupBy=day|roomType|both`

**Inclusion policy**
- Actual occupancy: `CheckedOut` only
- Forecast occupancy: `Confirmed + CheckedIn + CheckedOut`
- Always exclude: `Draft/Cancelled/NoShow`

**Semantics**
- Night range: `From (inclusive), To (exclusive)` for stay nights
- `SupplyRoomNights = ActiveRooms * nightsCount`
- `SoldRoomNights = sum(occupiedRooms by day)`

---

### ✅ Phase 4.4 — Dashboard KPIs (ADR / RevPAR / Trends)
**Endpoint**
- `GET /api/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD&mode=Actual|Forecast&includeRoomTypeBreakdown=true|false`

**KPIs**
- `ADR = TotalRevenue / SoldRoomNights` (0 if sold = 0)
- `RevPAR = TotalRevenue / SupplyRoomNights` (0 if supply = 0)
- Monetary rounding: 2 decimals (reuse financial helper)

**Tests/Report**
- `TEST_REPORT_DASHBOARD_PHASE44.md`

---

### ✅ Phase 5.1 — Reception Today View
**Endpoint**
- `GET /api/reception/today?date=YYYY-MM-DD`

**Lists (exclude always: Draft/Cancelled/NoShow)**
- Arrivals(date): `CheckIn == date` AND `Status == Confirmed`
- Departures(date): `CheckOut == date` AND `Status == CheckedIn`
- InHouse(date): `CheckIn <= date < CheckOut` AND `Status == CheckedIn`

**Tests/Report**
- `TEST_REPORT_RECEPTION_TODAY_PHASE51.md`

---

### ✅ Phase 5.2 — Reception Quick Actions
**Endpoints**
- `POST /api/reception/reservations/{id}/check-in`  body: `{ "businessDate": "YYYY-MM-DD" }`
- `POST /api/reception/reservations/{id}/check-out` body: `{ "businessDate": "YYYY-MM-DD" }`
- `POST /api/reception/reservations/{id}/cancel`    body: `{ "reason": "optional" }`
- `POST /api/reception/reservations/{id}/no-show`   body: `{ "reason": "optional" }`

**Transitions**
- Confirmed → CheckedIn (check-in)
- CheckedIn → CheckedOut (check-out)
- Confirmed → Cancelled (cancel)
- Confirmed → NoShow (no-show)

**Business date rules**
- Check-in: `businessDate == reservation.CheckIn`
- Check-out: `businessDate == reservation.CheckOut`

**Errors**
- 404 not found
- 400 bad input/date rule
- 409 invalid transition (`ConflictException`)

**Tests/Report**
- `TEST_REPORT_RECEPTION_ACTIONS_PHASE52.md`

---

### ✅ Phase 5.3 — Reception Reservation Search / Quick Lookup
**Endpoint**
- `GET /api/reception/reservations/search?query=...&date=YYYY-MM-DD&limit=20`

**Rules**
- query required, min 2 chars
- match by:
  - exact `reservationId` if query is Guid
  - contains: bookingNumber / guestName / phone (case-insensitive)
- optional date boosts ordering (in-house first, then arrivals, departures, then others)
- deterministic ordering

**Tests/Report**
- `TEST_REPORT_RECEPTION_SEARCH_PHASE53.md`

---

## 3) COMPLETED PHASES (RECENT — VERIFIED)

### ✅ Phase 6 — PDF Upload + OCR Parsing + Workflow
**Endpoints**
- `POST /api/pdf-reservations/upload` → `PendingReservationCreatedDto`
- `POST /api/pdf-reservations/{id}/parse` → `PdfParsingResultDto`
- `GET /api/reception/pending-requests` → `PendingRequestsDto`
- `POST /api/reception/reservations/{id}/confirm` → `ReservationStatusChangedDto`

**Status**
- All endpoints implemented and tested.
- 20 functional tests passed (Upload, Parsing, List/Hint, Confirm).
- Report: `TEST_REPORT_PDF_OCR_PHASE6.md`

---

## 4) REMAINING PHASES (BACKEND) — AFTER PHASE 6
> These are the remaining backend phases you mentioned (6/7/8/9).  
> Phase 6 is now defined above (PDF+OCR+pending). Next phases are proposed as:

### Phase 7 — Files/Attachments Management (Hardening)
- List attachments for reservation
- Download attachment (authorized)
- Delete attachment (optional, admin/owner only)
- Virus/size safeguards (minimal)

### Phase 8 — Housekeeping / Room Status (Optional for MVP)
- Room status: Clean/Dirty/OutOfService
- Endpoint to mark room status
- Today view can include room readiness hints

### Phase 9 — Reporting/Exports (Defer print to here)
- PDF print/export for:
  - arrivals list
  - pending requests list
  - reservation summary
- This is where “printing PDF” goes (as agreed: last step)

---

## 5) FRONTEND START CRITERIA
Start frontend when:
- Phase 6 endpoints are stable and test-covered
- Owner + Reception can:
  - Upload PDF → see Draft pending
  - See pending list + availability hint
  - Confirm draft to confirmed
  - Use today view + quick actions + search

---

## 6) LAST STOP / NEXT STEP
**Last completed:** Phase 6 ✅ (PDF Upload + OCR Workflow)
**Next:** Frontend Development Start

