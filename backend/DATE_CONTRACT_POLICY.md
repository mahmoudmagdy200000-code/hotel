# DATE_CONTRACT_POLICY.md

## Overview
To ensure consistency between the React frontend and the .NET backend, we follow a strict date contract policy.

## Business Dates (Check-In, Check-Out, Search Filters)
All dates representing business logic (without a time component) MUST use the `DateOnly` type or be serialized as a strict `YYYY-MM-DD` string.

### Rules:
1.  **Format**: `YYYY-MM-DD` (e.g., `2026-01-25`).
2.  **Timezone**: No timezone component. The date is relative to the hotel's local business day.
3.  **JSON Serialization**: These are represented as JSON strings.

### Examples:
- **Query Params**: `GET /api/reception/today?date=2026-01-25`
- **Request Body**:
  ```json
  {
    "checkInDate": "2026-01-25",
    "checkOutDate": "2026-01-28"
  }
  ```
- **Response Mapping**: All Phase 5 and Phase 6 DTOs have been updated to use `DateOnly` or string-mapped dates.

## Timestamps (Audit, Logs, System Events)
Dates representing a specific point in universal time (e.g., `CreatedAt`, `LastModified`) MUST remain as `DateTime` (ISO 8601) in UTC.

### Rules:
1.  **Format**: ISO 8601 with Zulu (Z) suffix.
2.  **JSON Serialization**: `2026-01-25T14:30:00Z`.

## Implementation Progress
- [x] `ReservationDto` updated to `DateOnly`.
- [x] `Reception` endpoints updated to `DateOnly` params.
- [x] `PendingRequests` already uses `DateOnly` / String mapping.
- [x] `ReceptionToday` already uses String mapping.
