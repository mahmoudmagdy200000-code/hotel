# Project Diagnostic Report: Hotel PMS Integration Audit

## A) Executive Summary
The Hotel PMS project has a functional foundation for PDF reservation processing, but currently suffers from **critical logic errors in data extraction** and **mismatches in the API contract**. While the frontend UI is professional and integrated with `sonner` and `ConfirmDialog`, the underlying data reliability is low.

**Current Status:**
*   **Working:** PDF uploading, database storage, basic UI rendering, and the core Clean Architecture flow.
*   **Broken:** Extraction accuracy for room counts and totals, error code consistency between parser and UI, and the TypeScript production build.

**Risk Level: HIGH**
Selling the MVP today would lead to immediate customer dissatisfaction due to:
1.  **Inaccurate Pricing:** The parser often captures "Subtotal" instead of "Grand Total".
2.  **Failed Builds:** The project cannot be deployed to production in its current state due to TS errors.
3.  **Data Mismatches:** Status messages for failed PDFs are often hidden or incorrect due to code string mismatches.

---

## B) Backend Data Ownership & Consistency
1.  **Source of Truth:**
    *   **Entity:** `Reservation` (Domain Entity) is the source of truth for all draft/pending requests.
    *   **Filter Logic:** `GetPendingRequestsQuery.cs` filters by `r.Status == ReservationStatus.Draft && r.Source == ReservationSource.PDF`.
    *   **Diagnostics:** Detailed parsing metadata (Status, CorrelationId, ErrorCode) is stored in the `Notes` field of the `Reservation` entity as a text blob and parsed via Regex during retrieval.

2.  **Pricing Data Origin:**
    *   **TotalAmount** and **Currency** are mapped directly from the `Reservation` entity fields.
    *   These fields are populated by `ParsePdfReservationCommandHandler` after the parsing pipeline completes.

3.  **Error Logic:**
    *   **Origin:** `StructuredPdfReservationParser` generates the original `ErrorCode`.
    *   **Storage:** The code is saved into the `Reservation.Notes` field.
    *   **Translation Gap:** Both the `ParsePdfReservationCommandHandler` and `GetPendingRequestsQuery` contain logic to translate error codes into messages, leading to duplication and potential inconsistency.

4.  **Error Code Mismatches:**
    *   The system lacks a single canonical list. 
    *   **Mismatch Proof:** 
        *   Parser uses `PDF_NO_TEXT` vs Query using `NO_TEXT_PDF`.
        *   Parser uses `PDF_ENCRYPTED` vs Query using `PROTECTED_PDF`.
        *   Result: UI displays generic error messages instead of specific guidance.

5.  **Validation Rules:**
    *   Implemented in `PdfExtractionRules.ValidateExtraction`.
    *   **Rules:** `CheckOut > CheckIn`, reasonable year range (+/- 2 years), and mandatory identifier (Guest Name or Booking Number).

---

## C) Parser Correctness (Rules + Mapping)
1.  **Extraction Rules:** Implemented for `guestName`, `bookingNumber`, `checkIn`, `checkOut`, `totalPrice`, `currency`, `phone`, and `roomsCount`.
2.  **Fixture Analysis:**
    *   **Rule Bug (RoomsCount):** In `booking_com_sample.txt`, the regex for rooms count captures `3` instead of `1` because "Number of nights: 3" is followed by the word "Room" on a new line, triggering the `(\d+)\s*room` pattern.
    *   **Rule Bug (Price):** In `agoda_sample.txt`, the "Total" regex matches "Room subtotal" (`285.00`) before it reaches "Grand total" (`330.00`) because the subtotal label is tried first in the label loop.
3.  **Normalization:**
    *   **Dates:** Normalized to `yyyy-MM-dd` using `CultureInfo.InvariantCulture`.
    *   **Currency:** `LE`/`L.E` normalized to `EGP`, `$` to `USD`.

---

## D) Tests & Reliability
1.  **Unit Test Summary:**
    *   **Total Tests:** 44 (Application.UnitTests)
    *   **Passing:** 40
    *   **Failing:** 4
2.  **Failing Test Details:**
    *   `ExtractRoomsCount_BookingComFormat_ReturnsOne`: Expected `1`, but found `3`. (Caused by newline greedy match).
    *   `ExtractTotalPrice_AgodaFormat_ReturnsEuroAmount`: Expected `330.00`, but found `285.00`. (Caused by label priority).
    *   `ExtractGuestName_BookingComFormat_ReturnsFullName`: Issues with newline handling or trailing whitespace trimming.
    *   `ExtractBookingNumber_BookingComFormat_ReturnsConfirmationNumber`: Potential regex group mismatch.
3.  **Recommendations:** 
    *   Update `ExtractRoomsCount` regex to require a space `\s+` rather than `\s*` to avoid newline matching across lines.
    *   Reorder `TotalPriceLabels` to check for `Grand Total` before generic `Total`.

---

## E) Frontend Contract & UX Alignment
1.  **Type Mismatches:**
    *   `src/pages/reservations/ReservationCreate.tsx` attempts to import `ReservationLineCommand`, which does not exist in `api/types/reservations.ts` (it should be `CreateReservationLineCommand`).
2.  **UX Fallbacks:**
    *   Total formatting correctly handles `$0.00` showing `null` inputs as `—` (implemented via optional chaining).
    *   Booking number filtering in `PendingRequests` uses the `bookingNumber` field with a fallback to empty string.
3.  **Refresh Behavior:**
    *   Queries correctly use `queryClient.invalidateQueries({ queryKey: ['pendingRequests'] })`, which successfully clears the cache including the parameterized date-range keys.

---

## F) Build & Tooling Issues
1.  **Production Build Errors (13 Errors found via `tsc -b`):**
    *   **TS1294 (erasableSyntaxOnly):** Caused by `export enum` in `reservations.ts` and `rooms.ts`. Modern TS build settings (5.8+) discourage enums as they generate runtime code.
    *   **TS6133 (noUnusedLocals):** Unused imports like `formatCurrency`, `isError`, `CardFooter`, and `Phone` are breaking the build due to strict linting.
    *   **TS2724 (Member Missing):** `ReservationLineCommand` named incorrectly in import.
2.  **Strategy:** 
    *   Shift `enum` to `const object + type union`.
    *   Perform an automated cleanup of unused imports.

---

## G) Prioritized Action Plan

| Rank | Task | Effort | Impact |
| :--- | :--- | :--- | :--- |
| **1** | **Fix TS Build Break:** Convert enums to const objects and fix `ReservationLineCommand` import. | S | Critical (Blocks Prod) |
| **2** | **Sync Error Codes:** Unify constants between Parser and Query (e.g., `PDF_NO_TEXT`). | S | Medium (Fixes UI) |
| **3** | **Refine Parser Regex:** Reorder Total Price labels and fix Room Count newline bug. | M | High (Data Integrity) |
| **4** | **Centralize Error Messaging:** Move error label logic to a shared Domain Service/Constants. | M | Low (Cleans Code) |
| **5** | **Cleanup Unused Code:** Remove all TS6133 unused markers in pages/hooks. | S | Low (Maintenance) |
