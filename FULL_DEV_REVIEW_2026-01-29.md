# 🏨 Hotel PMS – Full Dev Review Report

## Overview

**Date:** 2026-01-29 (Updated)  
**Frontend:** React + TypeScript (Vite), Tailwind, shadcn/ui, React Router v7, TanStack Query v5, Axios (JWT), i18n AR/EN + RTL  
**Backend:** .NET Web API (.NET 10), Clean Architecture + CQRS/MediatR, SQLite (dev), ProblemDetails error handling

---

## ✅ Blocking Issues (RESOLVED)

### 1. ~~Frontend Test Failure – Dashboard Test: Duplicate Text Match~~ ✅ FIXED
- **File:** `src/pages/dashboard/__tests__/Dashboard.test.tsx:36`
- **Fix Applied:** Used more specific selector: `screen.getByRole('button', { name: /Actual \(Realized\)/i })`
- **Status:** All 16 frontend tests passing

### 2. ~~Backend Functional Tests – PDF Parsing Test Failures~~ ✅ FIXED
- **Fix Applied:** 
  - Separated upload (creates Draft/Pending) from parse (triggers OCR)
  - Updated test assertions to expect Draft/Pending on upload
  - Fixed parse tests to use valid PDF content
  - Changed parse failure response to 422 Unprocessable Entity
- **Status:** All 98 backend functional tests passing

---

## ⚠️ Warnings / Risks (Remaining)

### 1. **ESLint Warnings – 4 remaining (down from 44)**
| File | Issue | Notes |
|------|-------|-------|
| `BusinessDateProvider.tsx` | `react-refresh/only-export-components` | Standard React pattern (Provider + hook) |
| `badge.tsx` | `react-refresh/only-export-components` | shadcn/ui pattern (component + variants) |
| `button.tsx` | `react-refresh/only-export-components` | shadcn/ui pattern (component + variants) |
| `useAuth.tsx` | `react-refresh/only-export-components` | Standard React pattern (Provider + hook) |

**Status:** These are not bugs – they are warnings about React Fast Refresh optimization. Acceptable for production.

**Fixed Issues (40 errors resolved):**
- ✅ Replaced all `catch (err: any)` with `catch (err: unknown)` + proper type narrowing
- ✅ Removed all unused imports/variables in test files
- ✅ Fixed `react-hooks/set-state-in-effect` in Rooms.tsx and useAuth.tsx
- ✅ Fixed `useMemo` dependency arrays in Financials.tsx and Occupancy.tsx
- ✅ Moved ProtectedRoute and AdminRoute to separate files
- ✅ Updated extractErrorMessage to use `unknown` type with proper type guards
- ✅ Fixed react-day-picker v9 component API in calendar.tsx

### 2. **Login Page Hardcodes Role to 'Owner'**
- **File:** `src/pages/Login.tsx:49`
- **Issue:** `role: 'Owner'` hardcoded for all users regardless of actual backend claims
- **Impact:** Role-based UI decisions may be incorrect for non-Owner users
- **Mitigation:** Parse JWT claims or call `/Users/manage/info` endpoint to get actual roles

### 3. **Playwright Not Installed (Web.AcceptanceTests)**
- **Issue:** E2E tests fail with "Executable doesn't exist at chromium-1194"
- **Impact:** E2E test suite cannot run
- **Fix:** Run `pwsh bin/Debug/netX/playwright.ps1 install` in test project

### 4. **MediatR License Warning**
- **Issue:** "You do not have a valid license key for the Lucky Penny software MediatR"
- **Impact:** Minor – allowed for dev/test but requires license for production
- **Mitigation:** Obtain license before production deployment

### 5. **EF Core Query Filter Warning**
- **Issue:** `Reservation` has global query filter but is required end of relationships with `ReservationAuditEvent` and `ReservationLine`
- **Impact:** May cause unexpected results when soft-deleted reservations are filtered
- **Mitigation:** Add matching query filters to child entities or configure navigation as optional

### 6. **NSwag Code Generation Failure During Build**
- **Issue:** NSwag fails to extract project metadata during full build
- **Impact:** Client code not auto-generated; may cause stale API clients
- **Mitigation:** This is a known issue with custom output paths; build still succeeds

---

## ✅ Confirmed OK

### Backend Health
| Check | Status |
|-------|--------|
| API builds clean | ✅ 0 warnings, 0 errors |
| SQLite DB connection | ✅ Configured in appsettings.Development.json |
| DB init runs on startup | ✅ `InitialiseDatabaseAsync()` in Development mode |
| Swagger/OpenAPI | ✅ Available at `/api` and `/api/specification.json` |
| CORS for Vite | ✅ `http://localhost:5173`, `http://127.0.0.1:5173`, `https://localhost:5173` |
| Authentication scheme | ✅ Bearer JWT with `IdentityConstants.BearerScheme` |
| ProblemDetails consistency | ✅ CustomExceptionHandler covers 400/401/403/404/409/422 |
| Unit tests | ✅ 101 passed (Application.UnitTests) |
| Functional tests | ✅ 98 passed (Application.FunctionalTests) |

### Frontend Health
| Check | Status |
|-------|--------|
| TypeScript compiles | ✅ `tsc --noEmit` passes |
| Vite build setup | ✅ Correct dependencies |
| Axios base URL | ✅ Uses `VITE_API_BASE_URL` env variable |
| React Query setup | ✅ Proper provider with `staleTime: 5min`, `retry: 1` |
| Auth guard | ✅ ProtectedRoute with loading state |
| 401 interceptor | ✅ Clears token and redirects to `/login` |
| PDF Object URL cleanup | ✅ `URL.revokeObjectURL()` in PdfViewer useEffect cleanup |
| i18n RTL support | ✅ `setDirection()` sets `dir` and `lang` attributes |
| Unit tests | ✅ 16 passed |
| ESLint | ✅ 4 warnings (non-blocking) |

### Contract & Integration
| Endpoint (FE → BE) | Path Match | Method | Params/Body | Response |
|--------------------|------------|--------|-------------|----------|
| Login | `/api/Users/login` | POST | ✅ | ✅ AccessTokenResponse |
| Reception Today | `/api/reception/today?date=` | GET | ✅ DateOnly | ✅ ReceptionTodayDto |
| Pending Requests | `/api/reception/pending-requests` | GET | ✅ from/to/limit | ✅ PendingRequestsDto |
| Reception Actions (check-in) | `/api/reception/reservations/{id}/check-in` | POST | ✅ businessDate | ✅ ReservationStatusChangedDto |
| Reception Actions (check-out) | `/api/reception/reservations/{id}/check-out` | POST | ✅ businessDate | ✅ |
| Reception Actions (cancel) | `/api/reception/reservations/{id}/cancel` | POST | ✅ reason | ✅ |
| Reception Actions (no-show) | `/api/reception/reservations/{id}/no-show` | POST | ✅ reason | ✅ |
| Reception Actions (confirm) | `/api/reception/reservations/{id}/confirm` | POST | ✅ | ✅ |
| Reception Search | `/api/reception/reservations/search` | GET | ✅ query/date/limit | ✅ ReceptionSearchResultDto |
| PDF Upload | `/api/pdf-reservations/upload` | POST | ✅ FormData | ✅ PendingReservationCreatedDto |
| PDF Parse | `/api/pdf-reservations/{id}/parse` | POST | ✅ | ✅ PdfParsingResultDto |
| PDF Download | `/api/pdf-reservations/{id}/download` | GET | ✅ | ✅ Blob |
| Attachment PDF | `/api/Attachments/reservations/{id}/pdf` | GET/HEAD | ✅ | ✅ FileStream |
| Dashboard | `/api/dashboard` | GET | ✅ params | ✅ DashboardDto |
| Occupancy | `/api/occupancy` | GET | ✅ params | ✅ OccupancySummaryDto |
| Financials | `/api/financials/revenue` | GET | ✅ params | ✅ RevenueSummaryDto |
| Reservations List | `/api/reservations` | GET | ✅ | ✅ ReservationDto[] |
| Reservation Details | `/api/reservations/{id}` | GET | ✅ | ✅ ReservationDto |
| Reservations CRUD | `/api/reservations/{id}/...` | POST | ✅ | ✅ |
| Rooms | `/api/rooms` | GET/POST/PUT/DELETE | ✅ | ✅ |
| Room Types | `/api/roomtypes` | GET/POST/PUT/DELETE | ✅ | ✅ |

### Error Handling
| Error Code | Backend | Frontend |
|------------|---------|----------|
| 400 ValidationProblemDetails | ✅ | ✅ `extractErrorMessage()` parses `errors` dict |
| 401 Unauthorized | ✅ ProblemDetails | ✅ Axios interceptor redirects |
| 403 Forbidden | ✅ ProblemDetails | ✅ Displayed in toast |
| 404 Not Found | ✅ ProblemDetails | ✅ Component handles |
| 409 Conflict | ✅ ProblemDetails | ✅ `extractErrorMessage()` extracts detail |
| 422 Unprocessable (PDF) | ✅ ProblemDetails + extensions | ✅ Displayed with error code |

### Date Contract
| Aspect | Status |
|--------|--------|
| Frontend sends `YYYY-MM-DD` | ✅ Via `isValidYYYYMMDD()` validation |
| Backend uses `DateOnly` | ✅ Query params and DTOs |
| JSON serialization | ✅ DateOnly → "YYYY-MM-DD" |

---

## 🧪 Recommended Dev Commands

### Backend
```powershell
# Build
dotnet build --nologo --verbosity quiet

# Run unit tests only (fast)
dotnet test tests/Application.UnitTests --nologo --verbosity minimal

# Run functional tests (integration)
dotnet test tests/Application.FunctionalTests --nologo --verbosity minimal

# Start API
dotnet run --project src/Web
```

### Frontend
```powershell
# Type check
npx tsc --noEmit

# Lint (fix issues)
npm run lint

# Run tests
npm test -- --run

# Dev server
npm run dev

# Production build
npm run build
```

---

## Summary

| Category | Count |
|----------|-------|
| ~~❌ Blocking Issues~~ | ~~2~~ → 0 ✅ |
| ⚠️ Warnings/Risks | 6 (4 ESLint non-blocking) |
| ✅ Confirmed OK | All core checks pass |

---

## Dev Status: ✅ READY FOR DEV

**All blocking issues resolved:**
1. ✅ Dashboard test selector fixed – 16/16 frontend tests passing
2. ✅ Backend functional tests updated – 98/98 tests passing
3. ✅ ESLint errors reduced from 44 to 4 (non-blocking warnings)

**Recommended before release:**
- Fix Login page to extract actual roles from JWT
- Install Playwright browsers for E2E tests
- Obtain MediatR production license

