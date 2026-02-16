---
trigger: always_on
---

# PHASE 8 — Branch-Scoped Admin + Listings (Implementation Reference)

> **Purpose:** This document is the single source of truth for implementing Phase 8 in strict numbered sub-phases.  
> **Rule:** The AI agent MUST follow the phase numbers and MUST NOT implement items from later phases early.  
> **Testing:** **No tests** in phases 8.1–8.5. All tests will be done in the final testing phase.

---

## Phase 8.1 — Branch Foundation
### Goal
Introduce a first-class `Branch` entity (property/branch) as the foundation for branch isolation.

### Backend Deliverables
1) **Domain**
- Add entity `Branch`:
  - `Guid Id`
  - `string Name` (required, max 120)
- Minimal invariants: Name not empty; length <= 120.

2) **Infrastructure (EF Core)**
- Add `DbSet<Branch>` to DbContext.
- Add `BranchConfiguration`:
  - Name required, max length 120
  - (Optional) unique index on Name if consistent with repo style.

3) **Migration**
- Create migration `AddBranches` → creates `Branches` table.

4) **Seed (Optional)**
- Only if the repo already seeds reference data:
  - seed “Branch A”, “Branch B”.
- Otherwise skip.

### Out of Scope
- No `BranchId` on any other tables.
- No authorization/filtering.
- No frontend work.
- No listings/aliases.

---

## Phase 8.2 — BranchId on Core Tables + Backfill
### Goal
Add required `BranchId` FK columns to core data so isolation becomes possible.

### Backend Deliverables
1) Add `Guid BranchId` to:
- `Rooms`
- `RoomTypes` (if used)
- `Reservations`
- `Expenses` (ONLY if Expenses already exists; otherwise defer)

2) EF mapping:
- Required FK to `Branches`
- Indexes on `BranchId` for each table.

3) Migration + backfill (CRITICAL):
- Migration name: `AddBranchIdToCoreTables`
- Add columns (nullable first if needed)
- Ensure at least one Branch exists:
  - If none, insert `Default Branch`
- Backfill all existing rows to default Branch
- Enforce NOT NULL
- Add FK constraints + indexes.

4) Minimal create-flow assignment (temporary, no auth yet):
- New records must have BranchId set to **default Branch**:
  - CreateRoom
  - CreateRoomType
  - CreateReservation (manual + PDF draft creation if present)
  - CreateExpense (if exists)
- Implement a small helper:
  - `IBranchResolver.GetDefaultBranchIdAsync()` used by handlers.

### Out of Scope
- Users BranchId / claims
- Branch-based authorization and filtering
- Frontend changes
- Listings/Aliases

---

## Phase 8.3 — User Branch Binding (Admin → Single Branch)
### Goal
Bind each Admin user to one `BranchId` and expose it in identity context (claims/current user service).

### Backend Deliverables
1) Storage
- Add `BranchId` column to Users (e.g., `AspNetUsers` or `UserProfile`):
  - `Guid? BranchId`
- Rule:
  - **Admin must have BranchId**
  - Optional: Owner/SuperAdmin may have BranchId null (only if you support global access)

2) Token/Claims
- Include claim `branch_id` in JWT for users who have a BranchId.

3) Current user context
- Extend `ICurrentUserService` (or equivalent) with:
  - `Guid? BranchId`
  - (Optional) `bool IsOwnerOrSuperAdmin`

4) Admin assignment workflow (minimal)
- Ensure there is a path to set BranchId for Admin users:
  - Either seed/update in DB for now,
  - Or provide a minimal admin endpoint to set user branch (optional, keep minimal).

### Out of Scope
- Enforcing filters globally (that is 8.4)
- Frontend branch selector
- Listings/Aliases

---

## Phase 8.4 — Enforcement (Branch-Scoped Data Isolation)
### Goal
**Admin must only see/modify data belonging to their Branch** — enforced in backend (not UI-only).

### Backend Deliverables
Choose ONE enforcement strategy and apply consistently:

**Option A (Preferred): Global Query Filter**
- Similar to SoftDelete filter.
- DbContext gets current BranchId (via injected service).
- Apply filter to:
  - Reservations
  - Rooms
  - RoomTypes
  - Expenses
- If BranchId is null and user is Owner/SuperAdmin → no filter (optional).
- Ensure audit queries using `.IgnoreQueryFilters()` remain correct.

**Option B: Filter per Query/Handler**
- Every admin query/command must apply:
  - `.Where(x => x.BranchId == currentUser.BranchId)`
- Guard endpoints that require Owner/SuperAdmin.

Also update workflows:
- CreateReservation must use current user’s BranchId (NOT default).
- Same for Rooms/RoomTypes/Expenses.

### Out of Scope
- Listings dropdown for PDF upload (that is 8.5)
- Auto-detect branch from PDF text

---

## Phase 8.5 — Branch Listings (Aliases) + PDF Upload uses ListingId
### Goal
Replace manual hotel name typing with a predefined **Listings** list per Branch.
PDF upload uses `listingId`, and backend resolves it to BranchId + listing name.

### Backend Deliverables
1) Entity: `BranchListing`
- `Guid Id`
- `Guid BranchId` (FK)
- `string Name` (required, max 120)
- `string? Channel` (optional: Booking/Agoda/Manual/Other)
- `bool IsActive` (default true)
- Unique index: `(BranchId, Name)`
- Migration: `AddBranchListings`

2) Endpoints (Admin-only, branch-scoped)
- `GET /api/admin/listings?includeInactive=false`
  - returns listings for current admin’s branch
- `POST /api/admin/listings`
  - body: `{ name, channel? }`
- `PATCH /api/admin/listings/{id}`
  - body: `{ name?, channel?, isActive? }`

3) PDF upload changes
- Replace manual `hotelName` requirement with `listingId` (Guid) in multipart/form-data.
- Validate listing belongs to current user’s branch.
- Save reservation draft:
  - `BranchId = listing.BranchId`
  - `HotelName (trace/display) = listing.Name` (or `ListingName` if you add a new field)
- (Optional) keep old `hotelName` field for 1 release for backward compatibility, then remove.

### Frontend Deliverables
1) Admin management UI
- Add a minimal “Listings” admin screen:
  - add listing
  - list listings
  - activate/deactivate

2) PDF upload UI
- Replace manual hotel name input with a **dropdown**:
  - fetch listings for current branch
  - require selecting a listing before upload
- Send `listingId` in upload request.

---

## Final Notes
- Each phase must end with a working build.
- Do not mix phases.
- Keep migrations deterministic and safe (especially backfill in 8.2).
- Tests are deliberately postponed.
