---
trigger: always_on
---

# FRONTEND_BACKEND_READINESS.md

**Project:** Hotel PMS (Backend: .NET Web API + Clean Architecture + CQRS)  
**Goal:** Document **everything the React frontend needs** to integrate safely and correctly.

---

## ⚠️ Audit limitation (why many items are UNKNOWN)
I attempted to locate and inspect your backend repository in this execution environment, but **no repository content is available here** (no `.sln`, `.csproj`, `Program.cs`, `Controllers/`, `appsettings*.json`, or `Properties/launchSettings.json` were found).

Because your hard rule is **“Do NOT invent endpoints, DTOs, or rules”**, this report **does not guess** any API shapes.

What you get instead:

1) A complete **readiness report structure** with every item the frontend needs.  
2) Every unknown item is marked **UNKNOWN (repo not accessible)**.  
3) Every required-but-not-verifiable area includes a **MISSING / smallest-change addition** proposal (Development-only where relevant).  
4) A **copy/paste extraction command set** (Section 10) that you can run in the real repo to fill all concrete details.

> If you run the commands in Section 10 and paste the outputs here, I can regenerate this file with **real** endpoints/DTOs/status codes from your repo without inventing anything.

---

# 1) API Base & Dev Setup

## Findings (from repo)
- **API base URL / ports (launchSettings):** **UNKNOWN (repo not accessible)**
- **Swagger UI URL:** **UNKNOWN**
- **OpenAPI JSON URL:** **UNKNOWN**
- **Environments (Development/Production):** **UNKNOWN**

## Minimum required for frontend
The frontend needs:
- A stable **dev** base URL (scheme + host + port), e.g. `https://localhost:####`.
- Swagger/OpenAPI enabled in Development (at least for the team).

## MISSING (smallest-change addition)
If swagger isn’t already configured:
- Enable swagger in **Development only** and expose:
  - `GET /swagger` (UI)
  - `GET /swagger/v1/swagger.json` (OpenAPI)

---

# 2) Authentication (REQUIRED for frontend)

## Findings (from repo)
- **Auth endpoints present (login/refresh/me):** **UNKNOWN (repo not accessible)**
- **JWT settings (issuer/audience/expiry):** **UNKNOWN**
- **Claims / Roles (Owner, Receptionist):** **UNKNOWN**
- **Auth scheme (Bearer JWT vs cookie):** **UNKNOWN**

## REQUIRED documentation (must come from repo)
For each auth endpoint that **exists**, document:
- **Method + path**
- **Request DTO schema** (DTO name + fields + example JSON)
- **Response DTO schema** (DTO name + fields + example JSON)
- **Status codes**: `200/400/401/403` (plus any others used)
- **Frontend storage rules**: where token is expected (Authorization header, cookie, etc.)

## MISSING: Minimal Auth Plan (smallest-change addition)
If auth is not implemented, the *minimum viable* auth for frontend MVP is:

### 2.1 `POST /api/auth/login`
- **Request DTO (example):**
  - `LoginRequestDto`
    - `username: string`
    - `password: string`
- **Response DTO (example):**
  - `AuthResponseDto`
    - `accessToken: string`
    - `refreshToken?: string` (optional; can be omitted in MVP)
    - `user: UserDto`
      - `id: string`
      - `username: string`
      - `roles: string[]` (must include `Owner` / `Receptionist`)
- **Status codes:**
  - `200 OK` success
  - `400 BadRequest` invalid payload
  - `401 Unauthorized` invalid credentials

### 2.2 `GET /api/auth/me`
- **Auth:** `[Authorize]`
- **Response DTO (example):** `MeDto` with id/username/roles
- **Status codes:** `200`, `401`

### 2.3 Role/claim requirements for frontend routing
Frontend needs deterministic role info for:
- Sidebar nav visibility
- Reception actions permissions
- Owner-only views (if any)

Minimum requirement:
- JWT contains `role` claims or an equivalent claim that maps to:
  - `Owner`
  - `Receptionist`

> **Smallest change:** store roles in the standard `ClaimTypes.Role` so `[Authorize(Roles="Owner")]` works without custom policy.

---

# 3) CORS & Security Headers

## Findings (from repo)
- **CORS policy present:** **UNKNOWN (repo not accessible)**
- **Allowed origins:** **UNKNOWN**
- **Allowed headers:** **UNKNOWN**
- **Allowed methods:** **UNKNOWN**
- **Authorization header allowed:** **UNKNOWN**
- **Any security headers added (HSTS, CSP, etc.):** **UNKNOWN**

## MISSING: Development-only CORS for Vite (smallest change)
If CORS is missing or too strict for local dev, apply **Development-only**:

**Requirement:** allow the Vite dev server:
- Origin: `http://localhost:5173`
- Must allow `Authorization` header (Bearer tokens)
- Must allow credentials if you use cookies (otherwise not required)

**Exact minimal change (Program.cs outline):**
- In service registration:
  - `builder.Services.AddCors(...)` with a named policy, e.g. `"DevCors"`
  - Policy allows:
    - `.WithOrigins("http://localhost:5173")`
    - `.AllowAnyMethod()`
    - `.AllowAnyHeader()` (or explicitly include `Authorization`, `Content-Type`)
- In middleware:
  - `if (app.Environment.IsDevelopment()) app.UseCors("DevCors");`

> Keep this **Development-only** to avoid changing production behavior.

---

# 4) Endpoints Needed by Frontend MVP (from existing phases)

## Findings (from repo)
Cannot list concrete endpoints/DTOs without repo access.

### Phase 5 (Reception)
- **5.1 Reception Today:** **UNKNOWN**
- **5.2 Reception Actions:** **UNKNOWN**
- **5.3 Reception Search:** **UNKNOWN**

### Phase 6 (PDF/OCR Flow)
- **6.1 PDF Upload:** **UNKNOWN**
- **6.2 PDF Parse:** **UNKNOWN**
- **6.3 Pending Requests:** **UNKNOWN**
- **6.4 Confirm Draft:** **UNKNOWN**

### Reference / Lookup endpoints (dropdowns)
- **Room types:** **UNKNOWN**
- **Rooms:** **UNKNOWN**
- **Reservation statuses:** **UNKNOWN**
- **Payment methods:** **UNKNOWN**

## REQUIRED endpoint documentation format (what must be filled from repo)
For every endpoint that exists, document:

- **Method + path**
- **Auth:** anonymous / `[Authorize]` / roles required
- **Query params / request body schema**
- **Response DTO schema**
- **Status codes:** at minimum `200`, plus relevant errors (`400`, `401`, `403`, `404`, `409`)

Use this template per endpoint:

```text
### <Friendly Name>
- Method: <GET|POST|PUT|PATCH|DELETE>
- Path: /api/...
- Auth: <Anonymous | Bearer JWT | Authorize Roles=...>
- Query params: ...
- Request body (DTO): ...
- Response (DTO): ...
- Status:
  - 200 OK: ...
  - 400 BadRequest: ...
  - 401 Unauthorized: ...
  - 403 Forbidden: ...
  - 404 NotFound: ...
  - 409 Conflict: ...
```

---

# 5) Attachments / PDF Viewing (Frontend requirement)

## Findings (from repo)
- **Storage type (DB blob, file system, object storage):** **UNKNOWN**
- **How PDF is referenced (AttachmentId, URL, ReservationId link):** **UNKNOWN**
- **Endpoints to list / download attachments:** **UNKNOWN**

## MISSING: Minimal attachment API (smallest-change addition)
If attachment listing/streaming endpoints are not already present, the minimum set is:

### 5.1 List attachments for a reservation
- `GET /api/reservations/{reservationId}/attachments`
- Response DTO example:
  - `AttachmentListItemDto`
    - `id: string`
    - `fileName: string`
    - `contentType: string` (e.g. `application/pdf`)
    - `sizeBytes: long`
    - `uploadedAt: string` (ISO datetime)

### 5.2 Stream/download attachment content
- `GET /api/attachments/{attachmentId}`
- Returns: `FileStreamResult` (or equivalent)
- Headers:
  - `Content-Type: application/pdf`
  - `Content-Disposition: inline; filename="..."` (or `attachment` based on your requirement)
- Status:
  - `200 OK`
  - `404 NotFound` if missing
  - `401/403` if auth required

> **Security note:** Avoid exposing raw file system paths. Use IDs.

---

# 6) Contract Rules (must be stable)

## Findings (from repo)
- **Date range semantics:** **UNKNOWN**
- **DateOnly JSON format:** **UNKNOWN**
- **Reservation status values:** **UNKNOWN**
- **Parsing status values:** **UNKNOWN**
- **Ordering rules for Pending Requests:** **UNKNOWN**
- **Paging conventions:** **UNKNOWN**
- **Money format (currency/amount):** **UNKNOWN**

## Required stability rules (what frontend needs, must match repo)
### 6.1 DateOnly
Frontend requires that **DateOnly is serialized as `YYYY-MM-DD`** everywhere.

- Example: `"checkInDate": "2026-01-25"`
- No time component, no timezone.

**MISSING (smallest change)** if backend doesn’t already enforce this:
- Add a consistent JSON converter for `DateOnly` (and nullable) in ASP.NET JSON options.
- Ensure Swagger documents it as `string` format `date`.

### 6.2 Date range semantics
Frontend must know whether date filters are:
- `[from, to]` inclusive-inclusive, or
- `[from, to)` inclusive-exclusive (recommended for ranges), etc.

**MISSING (smallest change)**:
- Pick one rule (prefer `[from, to)`), document it, and implement consistently in queries.

### 6.3 Reservation status strings
Requested canonical values:
- `Draft`, `Confirmed`, `CheckedIn`, `CheckedOut`, `Cancelled`, `NoShow`

**UNKNOWN** whether backend already uses these exact strings.

**MISSING (smallest change)**:
- Ensure enum → string serialization is stable and matches exactly.
- Avoid localized labels in API; keep localization in frontend.

### 6.4 Parsing status strings
Expected:
- `Pending`, `Parsed`, `Failed`

**UNKNOWN** whether backend uses these.

### 6.5 Deterministic ordering for “Pending Requests”
Frontend needs stable order (to avoid UI flicker). Examples:
- `createdAt desc`, or
- `uploadedAt desc`, or
- `priority desc, createdAt asc`

**UNKNOWN**.

**MISSING (smallest change)**:
- Define an ordering rule in query handler and document it.

### 6.6 Paging conventions
Frontend needs to know:
- `page` + `size` or `offset` + `limit`
- Whether responses include `totalCount`

**UNKNOWN**.

---

# 7) Error Handling Contract

## Findings (from repo)
- **ProblemDetails used:** **UNKNOWN**
- **Validation errors format:** **UNKNOWN**
- **NotFound/Conflict conventions:** **UNKNOWN**

## REQUIRED: ProblemDetails examples (what frontend will code against)
If you already use `ProblemDetails`/`ValidationProblemDetails`, document the exact shape returned.

### 7.1 Example — 400 validation error (ValidationProblemDetails)
```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "checkInDate": ["The checkInDate field is required."],
    "guestName": ["The length must be <= 100."]
  },
  "traceId": "00-...-..."
}
```

### 7.2 Example — 404 not found (ProblemDetails)
```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.5",
  "title": "Not Found",
  "status": 404,
  "detail": "Reservation not found.",
  "traceId": "00-...-..."
}
```

### 7.3 Example — 409 conflict (ProblemDetails)
```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.10",
  "title": "Conflict",
  "status": 409,
  "detail": "Room is no longer available for the selected dates.",
  "traceId": "00-...-..."
}
```

### 7.4 Example — 401 unauthorized
```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.2",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Missing or invalid access token.",
  "traceId": "00-...-..."
}
```

### 7.5 Example — 403 forbidden
```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.4",
  "title": "Forbidden",
  "status": 403,
  "detail": "You do not have permission to perform this action.",
  "traceId": "00-...-..."
}
```

## MISSING (smallest-change addition)
If you aren’t using ProblemDetails consistently:
- Add `app.UseExceptionHandler()` with ProblemDetails mapping in **all envs** (doesn’t change behavior for success paths)
- Ensure validation returns `ValidationProblemDetails` (default in `[ApiController]`).

---

# 8) Seed Data / Test Data for Frontend

## Findings (from repo)
- **Seed strategy present:** **UNKNOWN**
- **How to reset DB in dev:** **UNKNOWN**
- **Any sample PDF attachments shipped:** **UNKNOWN**

## Recommended minimal dataset (for MVP UI)
Frontend development needs at least:

- **Room types:** 4–6 type