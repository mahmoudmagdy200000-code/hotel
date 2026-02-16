---
trigger: always_on
---

# HOTEL PMS – FRONTEND MASTER PHASES (UNIFIED)

Version: **2026-01-25_v4 (COMPLETE)**
Status: **FINAL – Reservations Module moved after FE 3.3**

---

## FE 1 – Foundation (12%)

**Goal:** Solid technical base for all frontend work.

**Includes:**

* Vite + React + TypeScript bootstrap
* Folder structure (pages / api / hooks / components)
* Routing (React Router) + protected routes
* Axios base instance
* React Query setup
* Global layout (sidebar / header)

**Acceptance:**

* App boots cleanly
* Auth guard works
* No console errors

---

## FE 2 – Core UI & Auth (10%)

**Goal:** Authentication + shared UX patterns.

**Includes:**

* Login / Logout
* Role-based access (Reception / Owner / Admin)
* Shared UI components (Table, Modal, Form, Badge)
* Toast notifications
* Global error handling

**Acceptance:**

* Secure login flow
* Reusable components adopted across pages

---

## FE 3 – Reception (Operational)

### FE 3.1 – Business Date & Context (4%)

**Includes:**

* Business date selector
* Context provider for operational date

### FE 3.2 – Room & Availability View (6%)

**Includes:**

* Room inventory view
* Availability indicators per date

### FE 3.3 – Reception Operations (8%) ✅

**Includes:**

* Reception Today page
* Arrivals / Departures / In-house
* Summary cards
* Check-in / Check-out / Confirm / Cancel / No-show

**Acceptance:**

* All actions call real backend APIs
* UI refreshes correctly

---

## FE 4 – Reservations Module (MVP) ⭐

### FE 4.0 – Reservations List & Details (10%)

**Goal:** Central reservation management beyond "today".

**Includes:**

* Reservations list page
* Filters (date range, status, guest name – only if backend supports)
* Reservation details view
* Status lifecycle visibility

**Rules:**

* Read-only by default
* Create/Edit only if backend APIs exist

**Acceptance:**

* Accurate data from backend
* No mock data

---

## FE 4.1 – Pending Requests Queue (6%)

**Goal:** Handle PDF-uploaded draft reservations.

**Includes:**

* Pending requests list
* Date range filter
* Parsing status
* Availability hint (if provided)

**Acceptance:**

* Works with empty / error states

---

## FE 4.2 – Parse + Confirm Workflow (6%)

**Goal:** Convert pending requests into real reservations.

**Includes:**

* Parse action (OCR trigger)
* Parse success / failure handling
* Retry parsing (if allowed)
* Confirm / Cancel

**Acceptance:**

* Deterministic UI updates based on backend response

---

## FE 5 – Reception Search (Advanced) (5%)

**Goal:** Fast search across reservations & guests.

**Includes:**

* Global search
* Reuse Reservations components

---

## FE 6 – Rooms + Room Types (Owner Admin Lite) (8%)

**Goal:** Manage room inventory basics.

**Includes:**

* Room types list / create / edit
* Rooms list / create / edit
* Active / inactive rooms
* Room → type assignment

**Acceptance:**

* Stable forms
* Proper validation
* Handles conflict responses (409)

---

## FE 7 – Dashboard + Occupancy + Financials (Read-only First) (7%)

**Goal:** Operational visibility.

**Includes:**

* Dashboard summary cards
* Occupancy forecast view
* Financial totals by date range
* Simple charts (optional)

**Acceptance:**

* Accurate numbers
* Correct business date semantics

---

## FE 8 – Attachments / PDF Viewing (3%)

**Goal:** Secure viewing/downloading of uploaded PDFs.

**Depends on FE-0 decision:**

* Streaming endpoint OR
* Signed URL strategy

**Acceptance:**

* Auth-safe
* Works in Pending Requests & Reservation Details

---

## FE 9 – Production Polish & Release (7%)

**Goal:** Production-ready frontend.

**Includes:**

* Skeleton loading everywhere
* Global error boundary
* Permission-based UI
* Accessibility baseline
* Environment config & build optimization
* Smoke checklist + optional e2e tests

**Acceptance:**

* No console errors in core flows
* Stable RTL navigation

---

## Global Rules (ALL PHASES)

* Clean Architecture (API / hooks / UI)
* React Query for server state
* Backend OpenAPI is the single source of truth
* No hardcoded numbers or mock data
* Graceful loading, empty, and error states
