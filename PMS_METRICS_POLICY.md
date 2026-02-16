# Actual vs Forecast Metrics Policy

## Overview
This document defines the metrics logic used throughout the Hotel PMS for performance reporting, dashboard KPIs, and financial summaries.

## Core Definitions

### 1. Actual (Realized / Accounting)
The **Actual** mode represents **finalized financial reality**. It follows a strict accounting policy to ensure data integrity for auditing.
- **Inclusion Rule**: ONLY includes reservations with status `CheckedOut`.
- **Logic**: A reservation is considered "Actual" only after the guest has departed and the folio is theoretically closed.
- **Visual Color**: Slate / Gray (#1e293b)

### 2. Forecast (Operational / Reality)
The **Forecast** mode represents **operational reality**. It is used for staffing, procurement, and day-to-day management.
- **Inclusion Rule**: Includes `Confirmed` + `CheckedIn` + `CheckedOut`.
- **Logic**: Represents all business that is either already in-house or expected to arrive.
- **Visual Color**: Blue (#2563eb)

---

## Status Inclusion Table

| Reservation Status | Forecast (Operational) | Actual (Accounting) |
| :--- | :---: | :---: |
| Draft / Pending | No | No |
| **Confirmed** | **Yes** | **No** |
| **Checked-In** | **Yes** | **No** |
| **Checked-Out** | **Yes** | **Yes** |
| Cancelled | No | No |
| No-Show | No | No |

---

## Examples

### Scenario A: Confirmed Reservation
Guest has a booking for next week.
- **Forecast**: Revenue and occupancy ARE counted.
- **Actual**: Revenue and occupancy ARE NOT counted (Value = 0).

### Scenario B: Checked-In Guest
Guest is currently in the room (staying tonight).
- **Forecast**: Revenue and occupancy ARE counted.
- **Actual**: Revenue and occupancy ARE NOT counted (Value = 0).

### Scenario C: Checked-Out Guest
Guest stayed last night and departed this morning.
- **Forecast**: Revenue and occupancy ARE counted.
- **Actual**: Revenue and occupancy ARE counted.

---

## Technical Enforcement
This logic is enforced at the backend query level in the following handlers:
- `GetOccupancyQueryHandler`
- `GetRevenueSummaryQueryHandler`
- `GetDashboardQueryHandler`

**Do not modify the status filtering logic in these handlers without a formal change to accounting policy.**
