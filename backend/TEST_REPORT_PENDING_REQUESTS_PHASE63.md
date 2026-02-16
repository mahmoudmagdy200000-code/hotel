# Test Report: Phase 6.3 — Pending Requests List + Availability Hint

## Endpoint Summary
`GET /api/reception/pending-requests?from=YYYY-MM-DD&to=YYYY-MM-DD&includeHint=true&limit=50`

### Parameters:
- `from`, `to` (DateOnly, required): Range for requests and availability calculation. SEMANTICS: From inclusive, To exclusive.
- `includeHint` (bool, default true): Toggle availability calculation.
- `limit` (int, default 50, max 100).

## Implementation Details
- **Filtering**: Returns only reservations with `Status == Draft` and `Source == PDF`.
- **Date Semantics**: Includes draft reservations that overlap the provided range.
- **Availability Hint**: 
    - Reuses Forecast logic (Confirmed + CheckedIn + CheckedOut).
    - Calculated as: `SupplyRoomNights - ForecastSoldRoomNights - ThisDraftItemRoomNights`.
    - **Bucket Thresholds**:
        - `remaining >= 2` nights: **Safe**
        - `remaining == 1 or 0` nights: **Tight**
        - `remaining < 0` nights: **Overbook**
- **Ordering**: 
    1. Parsing Status: `Pending` (1), `Failed` (2), `Parsed` (3).
    2. `CreatedAtUtc` Descending (newest first).
- **SQLite Fix**: Resolved a `DateTimeOffset` ordering limitation by implementing in-memory sorting for audit timestamps.

## Integration Tests
**Command**: `dotnet test tests\Application.FunctionalTests\Application.FunctionalTests.csproj --filter "PendingRequestsTests"`

**Results**: **6 Passed**, 0 Failed.

### Covered Scenarios:
1. **Auth**: Returns 401 if unauthorized.
2. **Validation**: Returns 400 for invalid ranges (to <= from) or ranges longer than 90 days.
3. **Filtering**: Verified that only `Draft` reservations with `Source == PDF` are included.
4. **Ordering**: Verified priority (Pending > Failed > Parsed) and secondary chronological ordering.
5. **Hint Logic (Tight)**: Verified "Tight" bucket when supply matches demand exactly.
6. **Hint Logic (Overbook)**: Verified "Overbook" bucket when demand exceeds supply.

## Example Response Snippet
```json
{
  "from": "2026-05-20",
  "to": "2026-05-25",
  "totals": {
    "count": 1,
    "totalPendingRoomNights": 5,
    "safeCount": 0,
    "tightCount": 1,
    "overbookCount": 0
  },
  "items": [
    {
      "reservationId": 123,
      "bookingNumber": "PDF-20260520-XXXX",
      "guestName": "Extracted Name",
      "checkIn": "2026-05-20",
      "checkOut": "2026-05-25",
      "nights": 5,
      "requestedRooms": 1,
      "parsingStatus": "Parsed",
      "availabilityHint": {
        "bucket": "Tight",
        "availableRoomNights": 5,
        "forecastSoldRoomNights": 0,
        "supplyRoomNights": 5,
        "pendingRoomNights": 5,
        "note": "Capacity tight in range"
      }
    }
  ]
}
```
