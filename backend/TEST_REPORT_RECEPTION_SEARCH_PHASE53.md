# Test Report: Phase 5.3 — Reception Reservation Search

## Endpoint Summary
`GET /api/reception/reservations/search`

### Parameters:
- `query` (string, required): Matches BookingNumber, GuestName, or Phone (contains, case-insensitive). If numeric, matches `ReservationId`.
- `date` (YYYY-MM-DD, optional): Enables proximity and bucket-based ordering.
- `limit` (int, default 20, max 50): Number of results.

## Matching & Ordering Rules
### Search Logic:
- **Exclusion**: `Draft` reservations are **always excluded** from results to focus on actionable stays.
- **Matching**: Matches `GuestName`, `BookingNumber`, or `Phone` using `LIKE %query%`.
- **Exact Match**: If `query` is an integer, it attempts an exact match on `ReservationId`.

### Ordering Logic (when `date` is provided):
1. **Bucket 4 (InHouse)**: Stay-overs (Check-in < date AND Check-out > date).
2. **Bucket 3 (Arrivals)**: Check-in == date.
3. **Bucket 2 (Departures)**: Check-out == date.
4. **Bucket 1 (Others)**: All other matches.
Within buckets, results are ordered by **Closeness to date** (Absolute difference in days) and then by `CheckInDate` ascending.

## Integration Tests
**Command:** `dotnet test --filter "ReceptionSearchTests"`
**Results:** **7 Passed**, 0 Failed.

### Key Scenarios Tested:
- **Auth**: Unauthorized requests return 401.
- **Validation**: Query < 2 chars returns 400.
- **Booking Match**: Finds multiple reservations by booking number prefix.
- **Guest Name**: Case-insensitive search (e.g., "ahmed" finds "Ahmed Ali").
- **Draft Exclusion**: Confirmed matches included, Draft matches excluded.
- **Date Relevance**: Verifies ordering: Stay-over > Arrival > Departure > Distant.
- **Id Match**: Exact match by integer ID.

## Example Request/Response
**GET** `/api/reception/reservations/search?query=Ali&date=2026-01-25`

**Response (200 OK):**
```json
{
  "query": "Ali",
  "date": "2026-01-25",
  "results": [
    {
      "reservationId": 45,
      "bookingNumber": "BH-999",
      "guestName": "Ahmed Ali",
      "phone": "0123456789",
      "checkIn": "2026-01-24",
      "checkOut": "2026-01-27",
      "status": "CheckedIn",
      "roomTypeNames": ["Double Deluxe"],
      "totalNights": 3
    }
  ]
}
```
