# Test Report: Phase 6.4 — Confirm Draft Reservation

## Endpoint Summary
`POST /api/reception/reservations/{id}/confirm`

### Request Profile:
- **Method**: POST
- **URL**: `/api/reception/reservations/{id}/confirm`
- **Roles**: Owner, Receptionist

## Business Rules Implemented
- **Transition Eligibility**:
    - Current status must be `Draft`.
    - Source must be `PDF` (ReservationSource.PDF).
- **Availability Hint (Non-blocking)**:
    - Calculates forecast occupancy for the reservation's date range.
    - If demand exceeds supply (taking into account rooms count from extracted markers), a warning message is included in the response.
- **Audit**: Sets `ConfirmedAt` timestamp.
- **DTO**: Returns `ReservationStatusChangedDto` with old/new status, timestamp, business date (reference), and optional warning `Message`.

## Integration Tests
**Command**: `dotnet test tests\Application.FunctionalTests\Application.FunctionalTests.csproj --filter "ConfirmDraftReservationTests"`

**Results**: **6 Passed**, 0 Failed.

### Covered Scenarios:
1. **Auth**: Returns 401 Unauthorized without token.
2. **Not Found**: Returns 404 for non-existent IDs.
3. **Invalid Status**: Returns 409 Conflict if status is not Draft (e.g., Cancelled).
4. **Invalid Source**: Returns 409 Conflict if Draft but source is Manual.
5. **Successful Confirmation**: Verified status change and audit timestamp.
6. **Overbooking Warning**: Verified that a warning message is returned when availability is exceeded.

## Example Response (Success with Warning)
```json
{
  "reservationId": 123,
  "oldStatus": "Draft",
  "newStatus": "Confirmed",
  "changedAtUtc": "2026-01-25T12:30:00Z",
  "businessDate": "2026-05-20",
  "message": "Warning: Confirming these dates will cause OVERBOOKING."
}
```
