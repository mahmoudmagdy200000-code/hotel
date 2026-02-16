# Test Report: Phase 5.2 — Reception Quick Actions

## Endpoints Summary
All endpoints are under `/api/reception/reservations` and require authentication.

| Action | Endpoint | Method | Body | Result DTO |
| :--- | :--- | :--- | :--- | :--- |
| **Check-in** | `{id}/check-in` | POST | `{ "businessDate": "YYYY-MM-DD" }` | `ReservationStatusChangedDto` |
| **Check-out** | `{id}/check-out` | POST | `{ "businessDate": "YYYY-MM-DD" }` | `ReservationStatusChangedDto` |
| **Cancel** | `{id}/cancel` | POST | `{ "reason": "optional" }` | `ReservationStatusChangedDto` |
| **NoShow** | `{id}/no-show` | POST | `{ "reason": "optional" }` | `ReservationStatusChangedDto` |

## Transition Rules (Status Policies)
Implemented strict state machine transitions:

| From Status | To Status | Action | Notes |
| :--- | :--- | :--- | :--- |
| `Confirmed` | `CheckedIn` | Check-in | Enforces `businessDate == CheckInDate` |
| `CheckedIn` | `CheckedOut` | Check-out | Enforces `businessDate == CheckOutDate` |
| `Confirmed` | `Cancelled` | Cancel | `Draft` is blocked for reception actions |
| `Confirmed` | `NoShow` | NoShow | Terminal status |

### Violation Responses:
- **409 Conflict**: Invalid transition (e.g., trying to cancel a `CheckedIn` reservation).
- **400 Bad Request**: Date rule violation (e.g., check-in on the wrong day).
- **404 Not Found**: Reservation does not exist.
- **401 Unauthorized**: No valid auth token.

## Integration Tests Results
**Command:** `dotnet test --filter "ReceptionActionsTests"`
**Results:** **7 Passed**, 0 Failed.

### Covered Scenarios:
1. **Auth**: POST without auth returns 401.
2. **Check-in Happy Path**: Valid date + Confirmed -> CheckedIn (200 OK).
3. **Check-in Wrong Date**: Invalid business date -> 400 Bad Request.
4. **Check-out Happy Path**: Valid date + CheckedIn -> CheckedOut (200 OK).
5. **Invalid Transition**: CheckedIn -> Cancel -> 409 Conflict.
6. **Role/Status Restriction**: Draft -> Cancel -> 409 Conflict (Strict Phase 5.2 rules).
7. **Idempotency**: Re-applying same action to already-reached status returns success with current state.

## Example Request/Response
**POST** `/api/reception/reservations/123/check-in`
**Body:**
```json
{
  "businessDate": "2026-01-25"
}
```

**Response (200 OK):**
```json
{
  "reservationId": 123,
  "oldStatus": "Confirmed",
  "newStatus": "CheckedIn",
  "changedAtUtc": "2026-01-25T02:00:00Z",
  "businessDate": "2026-01-25"
}
```
