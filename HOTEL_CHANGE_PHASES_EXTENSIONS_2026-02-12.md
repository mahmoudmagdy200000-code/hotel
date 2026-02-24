# HOTEL_CHANGE_PHASES_EXTENSIONS_2026-02-12.md
> Change Phases — Nexa PMS (Backend .NET Clean Architecture + CQRS) + React Frontend  
> Timezone: Africa/Cairo (+02:00)  
> Scope: Implements the new requests discussed (multi-currency, hotel name, editable check-in, room availability view, expenses, etc.)

---

## 0) GLOBAL RULES (MUST FOLLOW)
- **Clean Architecture boundaries:** Web → Application → Domain/Infrastructure
- **CQRS + MediatR:** Queries/Commands + Handlers only (no business logic in endpoints)
- **DTO-only responses** (no entities in API responses)
- **ProblemDetails** via `CustomExceptionHandler`
- All endpoints are **[Authorize]**
- Follow **DateOnly contract** (`YYYY-MM-DD`) for all business dates
- **Metrics correctness:** Never aggregate monetary totals across mixed currencies. Use **currency filter**.
- Smallest-change refactoring only
- Add/adjust tests for each phase

---

## 1) OVERVIEW OF NEW REQUIREMENTS
1) Reception Today: show **rooms availability** (Available / Reserved / Occupied).  
2) Allow importing **old/past reservations via PDF**.  
3) Add **BalanceDue** (remaining unpaid amount) field in New Reservation and editable at check-in.  
4) Store **HotelName** on reservations created by PDF and New Reservation, and show/filter in **Audit**.  
5) Maintenance/Expenses: allow logging **Maintenance**, **Purchases**, **Breakfast**, plus **Other**.  
6) Payment method: **Cash / Visa / Other**.  
7) Currency: detect from PDF automatically; allow New Reservation currency: **EGP / USD / EUR (+ Other)**.  
8) Dashboard/Finance: add **currency filter** and compute totals per selected currency only.

---

# PHASE 7 — MULTI-CURRENCY, CHECK-IN EDIT, ROOMS STATUS, EXPENSES

## ▶️ Phase 7.1 — Reservation Financial Fields + HotelName (Domain/DB/DTO)
### Goal
Add core reservation fields needed by reception & finance:
- `HotelName`
- `BalanceDue`
- `PaymentMethod`
- `CurrencyCode` (+ optional `CurrencyOther`)

### Backend
**Domain**
- Update `Reservation` entity:
  - `HotelName` (string, max 120)
  - `BalanceDue` (decimal(18,2), default 0)
  - `PaymentMethod` enum: `Cash | Visa | Other`
  - `CurrencyCode` enum: `EGP | USD | EUR | Other`
  - `CurrencyOther` (string, max 12, optional; required when CurrencyCode == Other)

**EF Core**
- Add migration (example name): `AddReservationFinanceAndHotelFields`
- Configure column types:
  - decimals: `decimal(18,2)`
- Add configuration + constraints (lengths, required rules where applicable)

**Application**
- Update DTOs:
  - `ReservationDto`, `ReservationDetailsDto`, `PdfReservationDraftDto` (if exists)
- Update commands:
  - `CreateReservationCommand`, `UpdateReservationCommand`
- Validators:
  - `BalanceDue >= 0`
  - `HotelName` length <= 120 (recommended required for PDF/New flows)
  - `CurrencyOther` required when `CurrencyCode == Other`

### Frontend
- New Reservation form:
  - inputs: HotelName, Currency, PaymentMethod, BalanceDue
- Reservation details view:
  - display: HotelName, Currency, PaymentMethod, BalanceDue

### DoD
- Can create/update reservations with these fields.
- All endpoints still return DTO-only.
- Migration applies cleanly; no runtime EF warnings.

### Tests/Report
- Add/extend integration tests for create/update mapping and validation.
- Create: `TEST_REPORT_PHASE71_RESERVATION_FIELDS.md`

---

## ▶️ Phase 7.2 — PDF Enhancements (Past Dates + Currency Detection + HotelName input)
### Goal
1) Allow importing **past** reservation PDFs.  
2) Auto-detect **currency** from PDF content.  
3) Ensure `HotelName` can be provided for PDF-imported drafts.

### Backend
**PDF Upload Endpoint**
- Keep the current PDF upload workflow (Draft in pending queue).
- Extend multipart/form-data to accept `hotelName` (string).
- Store `HotelName` on the Draft reservation.

**Currency Detection**
- During parsing, detect currency using the extracted text:
  - `€` or `EUR` ⇒ `EUR`
  - `$` or `USD` ⇒ `USD`
  - `EGP` or `LE` or `ج.م` ⇒ `EGP`
- If not detected, default to `EGP` (editable later in reservation edit flow).

**Past Date Rule**
- Remove “no past dates” validation from the PDF workflow.
- Keep mandatory rule: `CheckOut > CheckIn`.

### Frontend
- PDF Upload UI:
  - add HotelName field before upload (required by UI)
  - show detected Currency in the pending row/details (read-only)

### DoD
- Uploading a past-dated PDF produces a Draft (Pending) without validation failure.
- Currency appears correctly for typical € / $ / EGP documents.

### Tests/Report
- PDF currency detection tests.
- Past-date acceptance test.
- Create: `TEST_REPORT_PHASE72_PDF_ENHANCEMENTS.md`

---

## ▶️ Phase 7.3 — Reception Today: Rooms Status (Available / Reserved / Occupied)
### Goal
Reception should see which rooms are free vs reserved vs occupied for a selected business date.

### Backend
**Endpoint**
- `GET /api/reception/rooms-status?date=YYYY-MM-DD`

**DTO**
- `ReceptionRoomsStatusDto`:
  - `date`
  - `items[]`: `{ roomId, roomNumber, roomTypeName, status, reservation? }`
- `status` enum/string: `Available | Reserved | Occupied`
- `reservation` (nullable): `{ reservationId, guestName, bookingNumber, checkIn, checkOut, hotelName }`

**Rules**
- Find an active reservation line for the room where:
  - `CheckIn <= date < CheckOut`
  - Status in `{ Confirmed, CheckedIn }`
  - Always exclude `{ Draft, Cancelled, NoShow }`
- `CheckedIn` ⇒ Occupied
- `Confirmed` ⇒ Reserved
- If no match ⇒ Available
- Order by `RoomNumber`

### Frontend
- Reception Today page:
  - add “Rooms” tab/section
  - filter chips: Available / Reserved / Occupied
  - table: Room#, Type, Status, Guest/Stay (when not available)

### DoD
- Reception Today shows accurate statuses for the selected date.

### Tests/Report
- Integration tests for each status case.
- Create: `TEST_REPORT_PHASE73_RECEPTION_ROOMS_STATUS.md`

---

## ▶️ Phase 7.4 — Editable Check-In (Add BalanceDue + PaymentMethod at check-in)
### Goal
At check-in time, reception can update “remaining amount” and payment method (especially for PDF-created reservations) and then complete check-in.

### Backend
**Update existing endpoint (preferred smallest change)**
- Current endpoint exists:
  - `POST /api/reception/reservations/{id}/check-in`
- Extend request body to include optional fields:
  - `businessDate: YYYY-MM-DD` (required, existing rule)
  - `balanceDue?: decimal`
  - `paymentMethod?: Cash|Visa|Other`
- Handler flow:
  1) Validate businessDate rules (same as current)
  2) If provided, update allowed fields (BalanceDue, PaymentMethod) with validation
  3) Transition Confirmed → CheckedIn

**Notes**
- Do NOT allow editing stay dates/room assignment here (unless a later phase adds it).
- Keep 409 Conflict for invalid transition.

### Frontend
- Check-in modal/dialog:
  - input: BalanceDue
  - dropdown: PaymentMethod
  - Confirm button calls the check-in endpoint with those fields

### DoD
- Check-in succeeds and saves BalanceDue/PaymentMethod updates.
- Works for both PDF-confirmed reservations and manually created ones.

### Tests/Report
- Integration test: check-in updates BalanceDue then status changes to CheckedIn.
- Create: `TEST_REPORT_PHASE74_EDITABLE_CHECKIN.md`

---

## ▶️ Phase 7.5 — Dashboard + Financials: Currency Filter
### Goal
Dashboard and Finance show money totals **per currency** using a filter.

### Backend
**Add optional query param to monetary endpoints**
- Dashboard:
  - `GET /api/dashboard?from&to&mode&includeRoomTypeBreakdown&currency=EGP`
- Financials Revenue:
  - `GET /api/financials/revenue?from&to&mode&groupBy=Day|RoomType&currency=EGP`

**Rules**
- Monetary totals include only reservations where `CurrencyCode == currency`.
- If currency is missing:
  - default to `EGP` (to keep behavior stable)
- Occupancy endpoints remain unchanged (not currency-based).

### Frontend
- Dashboard:
  - currency dropdown (EGP / USD / EUR / Other)
- Finance:
  - same currency dropdown
- When currency changes: refetch queries.

### DoD
- Switching currency changes totals accordingly.
- No mixed-currency aggregation.

### Tests/Report
- Integration tests verifying totals differ across currencies.
- Create: `TEST_REPORT_PHASE75_CURRENCY_FILTERS.md`

---

## ▶️ Phase 7.6 — Audit: Show + Filter by HotelName
### Goal
Audit views can show actions grouped/filtered by hotel name.

### Backend
- Ensure Reservation audit snapshots include `HotelName` (from entity fields).
- Extend audit list endpoints (where applicable) with:
  - `?hotelName=...` filter (case-insensitive contains or exact — pick one and document)
- Add `HotelName` column in audit DTO if not already present.

### Frontend
- Audit logs table:
  - show Hotel column
  - add hotel filter input/dropdown (at minimum: text filter)

### DoD
- Admin can filter audit logs to a specific hotel.

### Tests/Report
- Integration test: audit query returns only matching hotelName.
- Create: `TEST_REPORT_PHASE76_AUDIT_HOTEL_FILTER.md`

---

## ▶️ Phase 7.7 — Expenses (Maintenance / Purchases / Breakfast / Other)
### Goal
Allow staff to log expenses such as maintenance work, purchases, breakfast purchases, etc.

### Backend
**New entity/table**
- `Expense`:
  - `BusinessDate` (DateOnly)
  - `Category` enum: `Maintenance | Purchases | Breakfast | Other`
  - `Amount` decimal(18,2) (must be > 0)
  - `CurrencyCode` (EGP/USD/EUR/Other) + `CurrencyOther` (optional)
  - `PaymentMethod` (Cash/Visa/Other)
  - `Description` (max 200)
  - `Vendor` optional (max 120)
  - Soft delete optional (only if the project policy mandates; otherwise keep simple)

**Endpoints**
- `POST /api/expenses`
- `GET /api/expenses?from=YYYY-MM-DD&to=YYYY-MM-DD&category=...&currency=...`
- `GET /api/expenses/{id}`

**Validation**
- Amount > 0
- Date format valid
- CurrencyOther required if currency == Other

### Frontend
- Add page: “Expenses / Maintenance”
  - Create form (date/category/amount/currency/payment/description/vendor)
  - List with filters (date range, category, currency)

### DoD
- Can add expenses and view them by date/category/currency.
- Currency filter works similarly to financial totals.

### Tests/Report
- Integration tests for create/list/filter.
- Create: `TEST_REPORT_PHASE77_EXPENSES.md`

---

## 2) DELIVERY ORDER (RECOMMENDED)
1) Phase 7.1 (core reservation fields)  
2) Phase 7.2 (PDF enhancements)  
3) Phase 7.4 (editable check-in)  
4) Phase 7.3 (rooms status view)  
5) Phase 7.5 (currency filter dashboard/financials)  
6) Phase 7.6 (audit per hotel)  
7) Phase 7.7 (expenses module)

---

## 3) NON-GOALS (OUT OF SCOPE FOR THIS CHANGE SET)
- Full multi-tenant (HotelId linking Rooms/RoomTypes/Reservations to separate hotels)
- Currency conversion/exchange rates or “All currencies combined totals”
- Editing stay dates/room assignment at check-in (can be added in a later phase)

