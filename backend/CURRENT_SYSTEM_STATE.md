# CURRENT_SYSTEM_STATE.md

## Hotel PMS Backend — Current System State (Source of Truth)

> This document represents the **actual implemented state** of the Hotel PMS backend.
> It supersedes any earlier template or draft documents.
> All statements below are backed by green test reports.

---

## 1. Overall Status

- **Backend MVP:** ✅ Completed
- **Target scale:** Small hotel (~30 rooms)
- **Architecture:** Clean Architecture + CQRS (MediatR)
- **API Style:** REST, DTO-only
- **Auth:** Enabled on all endpoints
- **Test Coverage:** High (deterministic unit + integration tests)

The backend is **frontend-ready** and **production-safe for MVP usage**.

---

## 2. Implemented Phases Summary

### Phase 4 — Core Domain & Read Models (✅ Complete)

**Entities & Core Logic**
- RoomTypes
- Rooms
- Reservations

**Read Models & KPIs**
- Financials (Revenue, Breakdown, Forecast vs Actual)
- Occupancy (Supply, Sold, Forecast)
- Dashboard KPIs (ADR, RevPAR, Trends)

Status: **Stable and tested**

---

### Phase 5 — Reception Workflow (✅ Complete)

**Reception Views**
- Today View (Arrivals / InHouse / Departures)
- Reservation Search (date-aware relevance)

**Quick Actions**
- Check-in
- Check-out
- Cancel
- No-show

Status: **Fully usable for daily reception operations**

---

### Phase 6 — PDF / Draft / Pending / Confirm Workflow (✅ Complete incl. 6.5)

**PDF Intake**
- Upload PDF → Draft reservation
- Source marked as PdfUpload
- Placeholder Guest created
- No availability impact

**Parsing**
- IPdfReservationParser abstraction
- Deterministic fake parser for MVP/tests
- Parsing statuses: Pending / Parsed / Failed

**Pending Requests**
- Draft + PdfUpload only
- Availability hint: Safe / Tight / Overbook
- Deterministic ordering

**Confirmation**
- Draft → Confirmed only
- Source validation enforced
- Overbooking allowed (warning only, MVP rule)

Status: **End-to-end complete, tested, and documented (Phase 6.1 → 6.5)**

---

## 3. Explicitly Deferred (Post-Frontend)

The following items are **intentionally not implemented yet**:

- Attachments management (list/download/delete)
- Real OCR implementation
- Overbooking hard-block rules
- Housekeeping (room clean/dirty)
- Reports / Print / Export
- Production hardening (audit logs, cleanup)

All deferred items have **ready prompts** prepared separately.

---

## 4. What This System Can Do Today

- Run full reception daily workflow
- Track occupancy and financial KPIs
- Accept reservations via manual entry or PDF upload
- Forecast availability correctly
- Operate without frontend dependency

---

## 5. What This System Is NOT

- Not a template
- Not a mock
- Not missing core hotel logic

Any document stating otherwise refers to an **earlier historical state**.

---

## 6. Next Official Step

➡️ **Frontend Implementation (React + TypeScript + shadcn/ui)**

No backend changes are required before starting frontend work.

---

## 7. Source of Truth

Authoritative references:
- HOTEL_SYSTEM_MASTER_PHASES_UNIFIED_UPDATED_2026-01-25_v6.md
- TEST_REPORT_* documents for Phases 4, 5, and 6

---

## 8. Final Statement

> This backend represents a **real, working Hotel PMS MVP**.
> It is safe to proceed with frontend development immediately.

