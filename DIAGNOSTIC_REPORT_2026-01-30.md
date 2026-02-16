# 🏨 Diagnostic Report: Hotel PMS API Integration

**Date:** 2026-01-30
**Scope:** Vite+React+TS Frontend + .NET Backend API Contracts

---

## 0) Environment Snapshot
- **FE base URL**: `https://localhost:5003/api/` (Verified from `src/api/http.ts` and `.env`).
- **Backend Ports**: `5003` (HTTPS) / `5000` (HTTP). Running profile: `Web_AltPorts`.
- **Build Status**: Fresh build verified. `npm run build` exits with code 0 on current source.
- **Diagnostics**: Temporary logging injected into `http.ts` to capture full `ProblemDetails`.

---

## 1) Contract Baseline (Ground Truth)
- **Pending Requests** (`GET /api/reception/pending-requests`):
    - **Contract**: Supports `from`, `to`, `limit`.
    - **Validation**: Rejects if `to <= from` or `range > 90 days`.
- **Attachments** (`HEAD /api/Attachments/reservations/{id}/pdf`):
    - **Rule**: Returns `404 Not Found` if the reservation lacks a `[PDF_UPLOAD]` marker in its `Notes`.
- **Cancel Action** (`POST /api/reception/reservations/{id}/cancel`):
    - **Rule**: Allowed only for `Confirmed` or `Draft` statuses. All others return `409 Conflict`.

---

## 2) Evidence Pack (Raw)

### A) HEAD Attachments => 404
- **Request**: `HEAD https://localhost:5003/api/Attachments/reservations/17/pdf`
- **Response**: `404 Not Found` (Empty body).
- **Trigger**: `attachments.ts:13` inside `getAttachmentMetadata`.
- **Root Cause**: Speculative check on manual reservations that have no PDF. Axious interceptor logs the 404 as an error.

### B) POST Cancel => 409 Conflict
- **Request**: `POST https://localhost:5003/api/reception/reservations/17/cancel`
- **Response**: `409 Conflict`.
- **Body**: `{"title": "Conflict", "status": 409, "detail": "Cannot cancel reservation with status CheckedIn..."}`.
- **Root Cause**: UI allows clicking "Cancel" on reservations that are already `CheckedIn`.

### C) GET Pending Requests => 400 Bad Request
- **Request**: `GET https://localhost:5003/api/reception/pending-requests?from=...&to=...&includeHint=true&limit=...`
- **Response**: `400 Bad Request`.
- **Root Cause**: Transient invalid date ranges (`to <= from`) during UI selection firing before the "enabled" Boolean in React Query can block the request.

---

## 3) Root Cause Analysis (Summary)

| Issue | Classification | Explanation |
| :--- | :--- | :--- |
| **404 Attachments** | Noise | Technically correct (file missing), but triggers console error logs. Needs a `hasPdf` flag to avoid speculative calls. |
| **409 Cancellation** | UI Bug | Action buttons are visible for invalid reservation states. Need status-based rendering. |
| **400 Pending** | Race Condition | Invalid date ranges being briefly sent during rapid selection in the DatePicker. |

---

## 4) The Questions We MUST Answer

1. **Attachments**: Should we add a `HasAttachment` Boolean to the `ReservationDto`?
   - *Why*: To stop the FE from "guessing" via HEAD requests.
2. **Cancellation**: Is there any other status besides `Confirmed` and `Draft` that should allow cancellation?
   - *Why*: To ensure UI visibility matches backend logic perfectly.
3. **Pending Requests**: Is `includeHint` actually needed by the FE right now?
   - *Why*: If not, removing it simplifies the query signature.

---

## 5) Recommended Fix Options (Proposals)

- **Option A**: Update `ReservationDto` on the backend to include `bool HasAttachment`. Update FE to only check metadata if true.
- **Option B**: Implement strict action-button visibility logic in `ReservationDetails.tsx` based on `ReservationStatus`.
- **Option C**: Add a `debounceTime` to the date range change in `PendingRequests.tsx` to ensure only stable, valid ranges are sent to the API.

---

## 6) Action Plan

1.  **Backend**: Add `HasAttachment` to `ReservationDto`.
2.  **Frontend**: Guard `getAttachmentMetadata` call with `res.hasAttachment`.
3.  **Frontend**: Implement status-based button rendering in `ReservationDetails`.
4.  **Frontend**: Debounce/validate date range in `PendingRequests` before firing query.
5.  **Clean-up**: Remove diagnostic logging from `src/api/http.ts`.
