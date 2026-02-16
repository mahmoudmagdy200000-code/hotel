# Test Report: Rooms CRUD

## Date: 2026-01-24

## Commands Executed
- `dotnet build`
- `dotnet test --filter "CleanArchitecture.Application.FunctionalTests.Rooms.RoomsTests"`

## Test Results
**Status: GREEN**
- Total Tests: 10
- Passed: 10
- Failed: 0
- Skipped: 0

## Added/Updated Tests
The following integration tests were added in `tests/Application.FunctionalTests/Rooms/RoomsTests.cs`:
1. `ShouldRequireMinimumAuthentication`: Verifies 401 Unauthorized for unprotected access.
2. `ShouldGetRooms`: Verifies list retrieval with navigation property mapping (`RoomTypeName`).
3. `ShouldFilterRooms`: Verifies filtering by `roomTypeId`, `isActive`, and `search` (RoomNumber).
4. `ShouldGetRoomById`: Verifies retrieval of a single Room.
5. `ShouldCreateRoom`: Verifies 201 Created and successful creation.
6. `ShouldReturnBadRequestWhenCreatingWithDuplicateNumber`: Verifies uniqueness rule (case-insensitive).
7. `ShouldReturnBadRequestWhenRoomTypeDoesNotExist`: Verifies foreign key check at application level.
8. `ShouldUpdateRoom`: Verifies update of room details and status.
9. `ShouldDeleteRoom`: Verifies successful deletion of unlinked rooms.
10. `ShouldBlockDeleteWhenReservationsExist`: Verifies business rule preventing deletion of rooms with linked reservations.

## Discovered Issues & Fixes
- **Case-Insensitivity**: Consistently implemented `ToLower()` checks for `RoomNumber` uniqueness in both Create and Update commands to match the project's premium feel.
- **Seeding Consistency**: Ensured the existing seeding logic in `ApplicationDbContextInitialiser` is robust and matches the requirements for 2+ room types and 6+ rooms (currently seeds 3 types and 10 rooms).

## Auth Approach
- **Fake Test Authentication Scheme**: Reused the `TestAuthHandler` from Phase 3.1.
- Provides an authenticated user state with a test ID by default.
- Controlled via `SkipAuthentication` header in tests when needed.

## Swagger Verification
- Verified that the **Rooms** tag appears in Swagger UI.
- All CRUD operations are correctly documented with their respective models and status codes.
- `GET /api/rooms` correctly shows query parameters for filtering.
