# Test Report: Reservations Core Restructure (Multi-room)

## Date: 2026-01-24

## Objective
Implement Phase 4.0 — Reservations Core Restructure using `ReservationLines` to support multiple rooms per reservation and mixed room types.

## Commands Executed
- `dotnet ef migrations add UpdateReservationSchema`
- `dotnet ef database update`
- `dotnet build`
- `dotnet test --filter "CleanArchitecture.Application.FunctionalTests.Reservations.ReservationsTests"`
- `dotnet test --filter "CleanArchitecture.Application.FunctionalTests"` (Verified all current features)

## Test Results
**Status: GREEN**
- Total Functional Tests (All): 29
- Passed: 29
- Reservations Specific Tests: 7
- Passed: 7

## Added/Updated Tests
New tests in `tests/Application.FunctionalTests/Reservations/ReservationsTests.cs`:
1. `ShouldRequireMinimumAuthentication`: Confirms 401 for unauthorized access.
2. `ShouldCreateReservationWithOneLine`: Happy path for single-room booking.
3. `ShouldCreateReservationWithMultiRoom`: Happy path for multi-room booking.
4. `ShouldReturnBadRequestWhenOverlapping`: Verifies the availability check prevents double-booking.
5. `ShouldSucceedWhenOverlapWithCancelled`: Confirms that `Cancelled` reservations do not block room availability.
6. `ShouldCancelReservation`: Verifies status transition to `Cancelled`.
7. `ShouldGetReservationByIdWithLines`: Verifies detailed retrieval with room and room type information.

## Schema Changes
- **Reservation**: Added `PaidAtArrival` (bool), renamed `CheckInDate`/`CheckOutDate` to `CheckInDate`/`CheckOutDate` (kept consistent with original mapping after resolving property/method conflicts), and removed direct room references.
- **ReservationLine**: New entity to link rooms to reservations. Includes `RoomId`, `RoomTypeId`, `RatePerNight`, `Nights`, and `LineTotal`.
- **Relationship**: 1-to-Many between `Reservation` and `ReservationLine`.

## Discovered Issues & Fixes
- **Property/Method Conflict**: The entity had a property `CheckIn` and a method `CheckIn()`. This caused a compiler error (CS0102).
  - *Fix*: Renamed properties to `CheckInDate` and `CheckOutDate`.
- **FK Constraint Failures in Tests**: Initial tests failed because mandatory fields (`Currency`, `RatePerNight`, etc.) were missing in manual `AddAsync` calls.
  - *Fix*: Updated test setup to ensure all required fields for `Reservation` and `ReservationLine` are populated.
- **Breaking Change in Room Deletion**: The previous check for linked reservations in `DeleteRoomCommandHandler` broke after removing `RoomId` from `Reservation`.
  - *Fix*: Updated the handler to check the `ReservationLines` table instead.

## Notes on Implementation
- **Availability Rule**: Overlap is defined as `(newCheckIn < existingCheckOut) AND (existingCheckIn < newCheckOut)`.
- **Blocking Statuses**: Availability check considers `Confirmed`, `CheckedIn`, and `CheckedOut` as blocking. `Cancelled`, `NoShow`, and `New` are considered non-blocking for now.
- **Cascading Deletes**: Configuring EF to cascade delete `ReservationLines` when a `Reservation` is deleted.
- **Consistency**: The `RoomTypeId` is stored on the `ReservationLine` at the time of booking to maintain historical accuracy even if a room's type changes later.
