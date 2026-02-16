# Test Report: Reservations Advanced CRUD & Status Management (Phase 4.1)

## Date: 2026-01-24

## Objective
Implement explicit status transitions, edit rules based on status, and the "Draft is non-blocking" availability policy.

## Commands Executed
- `dotnet ef migrations add AddReservationAuditFields`
- `dotnet ef database update`
- `dotnet build`
- `dotnet test --filter "CleanArchitecture.Application.FunctionalTests.Reservations.ReservationsPhase41Tests"`

## Test Results
**Status: GREEN**
- Total Functional Tests (Phase 4.1): 7
- Passed: 7

### New Tests Coverage
1. `ShouldAllowOverlappingDraftReservations`: Verifies that `Draft` status does not block room inventory.
2. `ShouldEnforceAvailabilityOnConfirm`: Verifies that transitioning from `Draft` to `Confirmed` triggered an availability check.
3. `ShouldPerformFullTransitionFlow`: Verifies a complete lifecycle: `Draft -> Confirmed -> CheckedIn -> CheckedOut` with audit timestamps.
4. `ShouldReturnBadRequestForInvalidTransition`: Verifies that jumping from `Draft` to `CheckedIn` is forbidden.
5. `ShouldRestrictEditsInCheckedInStatus`: Verifies that rooms/dates cannot be changed once a guest has checked in.
6. `ShouldFreeAvailabilityOnCancel`: Verifies that room inventory is released when a reservation is cancelled.
7. `ShouldRestrictEditsInTerminalStatus`: Verifies that no edits (header or lines) are allowed for `CheckedOut`, `Cancelled`, or `NoShow`.

## Transition Matrix implemented
| From \ To | Draft | Confirmed | CheckedIn | CheckedOut | Cancelled | NoShow |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Draft** | - | Yes | No | No | Yes | No |
| **Confirmed** | No | - | Yes | No | Yes | Yes |
| **CheckedIn** | No | No | - | Yes | No | No |
| **CheckedOut** | No | No | No | - | No | No |
| **Cancelled** | No | No | No | No | - | No |
| **NoShow** | No | No | No | No | No | - |

## Business Decisions Confirmed
- **Draft NON-BLOCKING**: Multiple draft reservations can coexist for the same room and date. Inventory is only held when status is `Confirmed`, `CheckedIn`, or `CheckedOut`.
- **Edit Rules**:
  - `Draft` & `Confirmed`: Full edits allowed (re-validates availability).
  - `CheckedIn`: Header only (Guest name/Phone). No date/room changes.
  - `CheckedOut`, `Cancelled`, `NoShow`: Read-only.

## Schema Changes
- Removed `ReservationStatus.New` and added `ReservationStatus.Draft`.
- Added audit fields to `Reservation` table:
  - `ConfirmedAt` (DateTime?)
  - `CheckedInAt` (DateTime?)
  - `CheckedOutAt` (DateTime?)
  - `CancelledAt` (DateTime?)
  - `NoShowAt` (DateTime?)

## Fixes & Notes
- Centralized blocking statuses in `ReservationPolicy.BlockingStatuses`.
- Updated `CreateReservationCommand` to support initial status selection (defaults to `Draft`).
- Updated `UpdateReservationCommand` to prevent status changes (must use dedicated transition endpoints).
- Fixed several build errors related to missing usings and incorrect constructor dependency removals during refactoring.
