# Test Report: RoomTypes CRUD

## Date: 2026-01-23

## Commands Executed
- `dotnet build`
- `dotnet test --filter "CleanArchitecture.Application.FunctionalTests.RoomTypes.RoomTypesTests"`

## Test Results
**Status: GREEN**
- Total Tests: 12
- Passed: 12
- Failed: 0
- Skipped: 0

## Added/Updated Tests
The following integration tests were added in `tests/Application.FunctionalTests/RoomTypes/RoomTypesTests.cs`:
1. `ShouldRequireMinimumAuthentication`: Verifies 401 Unauthorized when no auth is provided.
2. `ShouldGetRoomTypes`: Verifies 200 OK and correct DTO mapping.
3. `ShouldFilterRoomTypesByIsActive`: Verifies the `isActive` query parameter works correctly.
4. `ShouldGetRoomTypeById`: Verifies retrieval of a single RoomType.
5. `ShouldReturnNotFoundForInvalidId`: Verifies 404 when ID doesn't exist.
6. `ShouldCreateRoomType`: Verifies 201 Created and database persistence.
7. `ShouldReturnBadRequestWhenCreatingDuplicateName`: Verifies business rule for unique names (case-insensitive).
8. `ShouldReturnBadRequestForInvalidCreatePayload`: Verifies FluentValidation (Name, Capacity, DefaultRate).
9. `ShouldUpdateRoomType`: Verifies 204 NoContent and database update.
10. `ShouldReturnNotFoundWhenUpdatingNonExistingId`: Verifies 404 on update.
11. `ShouldDeleteRoomType`: Verifies 204 NoContent and database removal.
12. `ShouldBlockDeleteWhenRoomsExist`: Verifies business rule preventing deletion of RoomTypes used by Rooms (returns 400 Bad Request).

## Discovered Issues & Fixes
- **Ambiguous NotFoundException**: Conflict between `Ardalis.GuardClauses.NotFoundException` and custom `Application.Common.Exceptions.NotFoundException`. 
  - *Fix*: Used fully qualified name in `CustomExceptionHandler.cs`.
- **Missing Seeding Errors**: Discovered during testing that `InvalidOperationException` (for blocked deletes) was returning 500. 
  - *Fix*: Updated `CustomExceptionHandler.cs` to handle `InvalidOperationException` and return 400 Bad Request with details.
- **NUnit1032 Warning**: TreatWarningsAsErrors caused build failure due to non-disposed `HttpClient`.
  - *Fix*: Added `[TearDown]` to `RoomTypesTests.cs` to dispose the client.

## Auth Approach
- **Fake Test Authentication Scheme**: Created `TestAuthHandler` in the test project.
- Configured as "TestScheme" in `CustomWebApplicationFactory.ConfigureWebHost`.
- Automatically signs in a test user for all requests unless the `SkipAuthentication` header is present.
- This allows testing protected endpoints without managing real JWT tokens or Identity database state in every test.

## Swagger Verification
- Verified that all endpoints appear under the **RoomTypes** tag.
- schemas for `RoomTypeDto`, `CreateRoomTypeCommand`, and `UpdateRoomTypeCommand` are correctly generated.
- `GET /api/roomtypes/{id}` correctly documents 404 response.
- `PUT` correctly documents 400/404 responses.
