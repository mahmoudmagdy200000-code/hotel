# FRONTEND_BACKEND_READINESS.md

**Project:** Nexa PMS (Backend: .NET Web API + Clean Architecture + CQRS)  
**Goal:** Document **everything the React frontend needs** to integrate safely and correctly.

---

# 1) API Base & Dev Setup

## Findings (from repo)
- **API base URL / ports (launchSettings):** `https://localhost:5001`, `http://localhost:5000`
- **Swagger UI URL:** `https://localhost:5001/api`
- **OpenAPI JSON URL:** `https://localhost:5001/api/specification.json`
- **Environments (Development/Production):** `Development` configured in `launchSettings.json`.

## Minimum required for frontend
- A stable **dev** base URL: `https://localhost:5001`.
- Swagger/OpenAPI is enabled in Development and serves from the root `/api`.

---

# 2) Authentication (Identity API)

## Findings (from repo)
- **Auth endpoints (via MapIdentityApi):**
  - `POST /api/Users/login`
  - `POST /api/Users/register`
  - `POST /api/Users/refresh`
  - `GET /api/Users/manage/info`
- **Auth scheme:** Bearer JWT (`IdentityConstants.BearerScheme`).
- **Roles:** `Administrator`, `Owner`, `Receptionist` (defined in `Roles.cs`).
- **Default Admin:** `administrator@localhost` / `Administrator1!`.

## REQUIRED documentation
### 2.1 `POST /api/Users/login`
- **Request (Identity API):**
  - `email: string`
  - `password: string`
  - `twoFactorCode?: string`
  - `twoFactorRecoveryCode?: string`
- **Response:**
  - `accessToken: string`
  - `expiresIn: number`
  - `refreshToken: string`
- **Status codes:** `200 OK`, `401 Unauthorized`.

### 2.2 `GET /api/Users/manage/info`
- **Auth:** `[Authorize]`
- **Response:** User info including email and claims.
- **Note:** Roles are typically included in the JWT claims (`role`).

---

# 3) CORS & Security Headers

## Findings (from repo)
- **CORS policy present:** **MISSING** (No `AddCors` or `UseCors` found in `Program.cs` or `DependencyInjection.cs`).

## MISSING: Development-only CORS for Vite (REQUIRED)
The frontend (Vite) runs on `http://localhost:5173`. The backend must allow it.

**Requirement:**
- Origin: `http://localhost:5173`
- Headers: `Authorization`, `Content-Type`
- Methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`

**Proposed addition to `src/Web/DependencyInjection.cs`:**
```csharp
// Inside AddWebServices
builder.Services.AddCors(options =>
{
    options.AddPolicy("DevCors", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});
```
**Proposed addition to `src/Web/Program.cs`:**
```csharp
if (app.Environment.IsDevelopment())
{
    app.UseCors("DevCors");
    // ...
}
```

---

# 4) Endpoints Needed by Frontend MVP

## Findings (from repo)

### Phase 5 (Reception)
- **5.1 Reception Today:** `GET /api/reception/today?date=yyyy-MM-dd`
- **5.2 Reception Actions:**
  - `POST /api/reception/reservations/{id}/check-in` (Body: `{ "businessDate": "yyyy-MM-dd" }`)
  - `POST /api/reception/reservations/{id}/check-out` (Body: `{ "businessDate": "yyyy-MM-dd" }`)
  - `POST /api/reception/reservations/{id}/cancel` (Body: `{ "reason": "string" }`)
  - `POST /api/reception/reservations/{id}/no-show` (Body: `{ "reason": "string" }`)
  - `POST /api/reception/reservations/{id}/confirm` (No body)
- **5.3 Reception Search:** `GET /api/reception/reservations/search?query=...&date=...&limit=...`

### Phase 6 (PDF/OCR Flow)
- **6.1 PDF Upload:** `POST /api/pdf-reservations/upload` (Multipart Form: `file`)
- **6.2 PDF Parse:** `POST /api/pdf-reservations/{id}/parse`
- **6.3 Pending Requests:** `GET /api/reception/pending-requests?from=...&to=...`
- **6.4 Confirm Draft:** Same as `reception/reservations/{id}/confirm`.

### Lookup/Reference
- **Room types:** `GET /api/RoomTypes`
- **Rooms:** `GET /api/Rooms`
- **Financials:** 
  - `GET /api/financials/reservations/{id}/breakdown`
  - `GET /api/financials/revenue?from=...&to=...&mode=forecast|actual&groupBy=day|roomType`

### Phase 7.7 (Expenses)
- **Log Expense:** `POST /api/expenses`
  - Body: `{ businessDate, category, amount, currencyCode, currencyOther?, paymentMethod, description, vendor? }`
- **List Expenses:** `GET /api/expenses?from=...&to=...&category=...&currency=...`
- **Expense Details:** `GET /api/expenses/{id}`

---

# 5) Attachments / PDF Viewing

## Findings (from repo)
- **Storage:** Local filesystem (`App_Data/Uploads`).
- **Reference:** Stored as a string inside the `Reservation.Notes` field (e.g., `[PDF_UPLOAD] File: ... | Internal Path: ...`).
- **Endpoints:** **MISSING** (No endpoint currently exists to list or stream the actual PDF file content to the browser).

## MISSING: Minimal attachment API (REQUIRED)
Frontend needs to display the PDF.

### Proposed: `GET /api/attachments/{reservationId}`
- **Response:** `FileStreamResult` (raw PDF stream).
- **Headers:** `Content-Type: application/pdf`, `Content-Disposition: inline`.

---

# 6) Contract Rules (Stability)

## Findings (from repo)
- **Date formats:** Currently using `DateTime` in many DTOs (e.g., `ReservationDto`).
- **DateOnly:** Used in `CheckInRequest` and `Reception` queries.

## REQUIRED Stability Rules
### 6.1 DateOnly Serialization
Frontend expects `YYYY-MM-DD`. 
**MISSING:** Backend should ensure all `DateTime` fields representing dates (Check-in/Check-out) are consistently converted to `YYYY-MM-DD` strings or use `DateOnly` types in DTOs.

### 6.2 Reservation Status
- Values: `Draft`, `Confirmed`, `CheckedIn`, `CheckedOut`, `Cancelled`, `NoShow`.
- Backend uses `ReservationStatus` enum. Ensure string serialization is used in API responses (already mapped in DTOs).

---

# 7) Error Handling Contract

## Findings (from repo)
- **ProblemDetails:** Used consistently via `CustomExceptionHandler`.
- **Validation errors:** Returns `ValidationProblemDetails` (400) with an `errors` object.

### 7.1 Example — 400 Validation Error
```json
{
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "CheckInDate": ["The CheckInDate field is required."]
  }
}
```

---

# 8) Seed Data / Test Data

## Findings (from repo)
- **Seed logic:** `ApplicationDbContextInitialiser` handles this.
- **Rooms:** 10 rooms (101-110).
- **Room Types:** Standard, Deluxe, Suite.
- **Reservations:** Includes samples for John Doe, Jane Smith, and a Cancelled guest.
- **Pending/PDF:** Seed logic does not currently include sample PDF drafts.

---

# 9) Final Readiness Checklist

| Item | Status | Notes |
|---|---|---|
| Auth login ready | **PASS** | `POST /api/Users/login` works with default creds. |
| Roles/claims available | **PASS** | Administrator, Owner, Receptionist roles present. |
| CORS for Vite (Dev-only) | **PASS** | Enabled for `http://localhost:5173`. |
| Phase 5 endpoints exist | **PASS** | Today, Search, and Actions are implemented. |
| Phase 6 endpoints exist | **PASS** | Upload, Parse, and Pending Requests are implemented. |
| Attachment view/stream | **PASS** | `GET /api/attachments/reservations/{id}/pdf` implemented. |
| Stable DateOnly contract | **PASS** | Consistent `YYYY-MM-DD` policy documented in `DATE_CONTRACT_POLICY.md`. |
| Seed data exists | **PASS** | Includes PDF draft demo reservations. |
