# Reservation Soft Delete & Audit Trail Implementation Summary

This document summarizes the changes made to implement the **Soft Delete** and **Audit Trail** system for the Nexa PMS.

## 1. Backend Changes (.NET Core)

### Domain Layer
- **Reservation Entity**: Added soft-delete metadata:
    - `IsDeleted` (bool)
    - `DeletedAtUtc` (DateTime?)
    - `DeletedByUserId` (string)
    - `DeletedByEmail` (string)
    - `DeleteReason` (string, max 200 chars)
- **ReservationAuditEvent Entity**: Created a new entity to store immutable snapshots of deleted reservations, including:
    - `ReservationId`, `ActorEmail`, `OccurredAtUtc`, `Reason`, and `SnapshotJson`.

### Application Layer
- **DeleteReservationCommand**: 
    - Implemented logic to set `IsDeleted = true`.
    - Added validation to prevent deleting reservations that are `CheckedIn` or `CheckedOut`.
    - Automatically serializes the entire reservation state into JSON and saves it to the audit table.
- **Global Query Filters**:
    - Updated `GetReservations`, `SearchReservations`, `GetReservationById`, `GetReceptionToday`, and `Financials` to automatically exclude records where `IsDeleted == true`.
    - Updated PDF streaming queries to block access to files associated with deleted reservations.
- **Admin Audit Queries**: Created `GetReservationDeletes` and `GetReservationAuditDetails` to allow administrators to review historical data.

### Infrastructure & Web
- **EF Core Configuration**: Added indexes on `IsDeleted` and Audit fields for performance.
- **API Endpoints**: 
    - `DELETE /api/reservations/{id}?reason=...`
    - `GET /api/admin/audit/reservations/deletes` (Administrator role only).
- **Migrations**: Applied `AddReservationSoftDeleteAndAudit` migration.

## 2. Frontend Changes (React + Vite)

### API & State Management
- **Reservations API**: Added `deleteReservation` method to the Axios wrapper.
- **Admin API**: Created `admin.ts` to handle audit log retrieval.
- **useReservationActions**: Integrated the `remove` mutation to handle deletion and cache invalidation.

### User Interface
- **Reservation Details**: 
    - Added a **Delete (Trash)** button to the header.
    - Implemented a confirmation dialog that prompts for an optional "Reason for deletion".
- **Admin Audit Logs Page**:
    - A new specialized view for Administrators.
    - Searchable table of deleted items.
    - Modal popup to view the **JSON Snapshot** of the deleted data.
- **Navigation & Security**:
    - Added "Audit Logs" to the sidebar for Administrator users.
    - Implemented `AdminRoute` guard to secure audit views.

### Localization
- **i18n**: Added all necessary English translations for "Delete", "Audit Logs", "Reason", etc.

## 3. Verification
- **Functional Tests**: Created `ReservationsSoftDeleteTests.cs` to verify:
    - Successful soft deletion.
    - Correct data exclusion from regular lists.
    - Security validation (Blocking deletion of active stays).
    - Presence of records in the audit trail.

---
*Created on: 2026-01-29*
