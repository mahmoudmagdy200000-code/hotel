# Test Report: Phase 4.3 — Occupancy & Forecast
**Date:** 2026-01-25
**Version:** 1.0
**Status:** ✅ Passed

## 1. Summary
This phase focused on implementing Occupancy Read Models to power dashboard visualizations. It provides aggregated statistics on occupied rooms, room nights sold, and occupancy rates, with support for filtering by mode (Actual vs Forecast) and grouping by day or room type.

**Key Deliverables:**
- **DTOs:** `OccupancySummaryDto`, `OccupancyDayDto`, etc.
- **Query:** `GetOccupancyQuery` with robust date range validation and inclusion logic.
- **Endpoint:** `GET /api/occupancy` (Safe, idempotent, read-only).
- **Logic:**
  - **Start/End:** From (inclusive) to To (exclusive) for stay intervals.
  - **Actual Mode:** Includes only `CheckedOut` reservations.
  - **Forecast Mode:** Includes `Confirmed`, `CheckedIn`, `CheckedOut`.
  - **Exclusion:** `Draft`, `Cancelled`, `NoShow` always excluded.
  - **Supply:** Total active rooms * nights.
  - **Occupied:** Distinct RoomId count per night.

## 2. Test Execution Results

**Command:** `dotnet test --filter "OccupancyTests"`
**Result:** Passed (5/5 tests)

| Test Name | Outcome | Description |
|-----------|---------|-------------|
| `ShouldReturn401WhenUnauthenticated` | ✅ Passed | Verifies endpoint protection. |
| `ShouldMeasureStayNightAllocationCorrectly` | ✅ Passed | Validates logic: Reservation spanning N nights counts as occupied for those N nights. |
| `ShouldFilterByModeActualVsForecast` | ✅ Passed | Ensures 'Actual' excludes future/active reservations, while 'Forecast' includes them. |
| `ShouldExcludeDraftCancelledNoShow` | ✅ Passed | Verifies valid status filtering policy. |
| `ShouldGroupOccupancyByRoomType` | ✅ Passed | Verifies breakdown logic (Occupancy per RoomType). |

**Full Suite:**
- Total Tests: **51**
- All passed.

## 3. Technical Notes
- **Performance:** Query uses `AsNoTracking` and specific status/date filtering at DB level before in-memory processing.
- **Accuracy:** "Occupied Rooms" metric uses distinct count of RoomIDs per night, preventing duplicate counts if data anomalies existed (though business logic prevents overlap).
- **Defaults:** API defaults to 'Forecast' mode and 'Both' grouping if unspecified.

## 4. Next Steps
- **Phase 4.4 - Dashboard KPIs:** Use these read models + Finance read models to compute ADR (Average Daily Rate) and RevPAR.
