# Test Report: Phase 6 — PDF Upload & OCR Workflow

## Scope Summary
Phase 6 implements a complete workflow for handling PDF-based hotel reservations:
1. **Upload**: Reception/Owner uploads a PDF booking confirmation.
2. **Draft Creation**: A non-blocking `Draft` reservation is created with source `PDF`.
3. **OCR Parsing**: Structured data (Guest name, dates, price) is extracted from the PDF and mapped to the reservation.
4. **Pending Queue**: Owners can see a prioritized list of these drafts with real-time occupancy "hints".
5. **Confirmation**: A manual review step to transition the reservation from `Draft` to `Confirmed`.

## Endpoints

### 1. Upload PDF
- **Endpoint**: `POST /api/pdf-reservations/upload`
- **Content-Type**: `multipart/form-data`
- **Output**: `PendingReservationCreatedDto`
- **Behavior**: Saves file to `App_Data/Uploads`, creates `Draft` reservation, and adds `[PDF_UPLOAD]` markers to notes.

### 2. Parse PDF
- **Endpoint**: `POST /api/pdf-reservations/{id}/parse`
- **Output**: `PdfParsingResultDto`
- **Behavior**: Uses `IPdfReservationParser` to extract data. Updates `GuestName`, `Phone`, `CheckInDate`, `CheckOutDate`, `TotalAmount`, and `Currency`. Updates notes with `[EXTRACTED]` data and `[PARSING_STATUS]`.

### 3. Pending Requests List
- **Endpoint**: `GET /api/reception/pending-requests?from=...&to=...&includeHint=true`
- **Output**: `PendingRequestsDto`
- **Behavior**: Lists `Draft` reservations from `PDF` source.
- **Ordering**: Priority: `Pending` -> `Failed` -> `Parsed`. Secondary: `CreatedAtUtc` Descending.

### 4. Confirm Draft
- **Endpoint**: `POST /api/reception/reservations/{id}/confirm`
- **Output**: `ReservationStatusChangedDto`
- **Behavior**: Transitions `Draft` -> `Confirmed` for `PDF` source reservations. Validates source and status (409 Conflict if invalid). Returns overbooking warnings if capacity is tight.

## Parsing & Deterministic Testing
- **Interface**: `IPdfReservationParser` allows for plugging in real OCR services (e.g., Tesseract, Azure AI).
- **Basic Implementation**: `BasicPdfReservationParser` provides a safe fallback (returns "Not Configured" error).
- **Testing Strategy**: Uses a `FakePdfReservationParser` in functional tests to provide deterministic extraction results without requiring real PDF files or OCR processing.

## Availability Hint (Forecast-based)
The system calculates a "Hint" to help receptionists decide whether to confirm a pending request.
- **SupplyRoomNights**: Active Rooms * Nights in range.
- **ForecastSoldRoomNights**: Sum of booked rooms (Confirmed/CheckedIn/CheckedOut) for the range.
- **PendingRoomNights**: Rooms requested by the Draft reservation * Nights.
- **AvailableRoomNights**: `Supply - ForecastSold`.
- **Policy (Remaining = Available - Pending)**:
    - **Safe**: `Remaining >= 2` nights.
    - **Tight**: `Remaining` is `0` or `1` nights.
    - **Overbook**: `Remaining < 0`.

## Testing Suite Results
- **PdfUploadTests**: 3 Passed (Auth, Success, Validation).
- **PdfParsingTests**: 5 Passed (Auth, 404, 409, Mapping Success, Mapping Failure).
- **PendingRequestsTests**: 6 Passed (Auth, Validation, Filtering, Ordering, Hint Buckets).
- **ConfirmDraftReservationTests**: 6 Passed (Auth, 404, 409 Status, 409 Source, Success, Warning Logic).

**Total Suite**: 20 functional tests verifying the end-to-end PDF workflow.

## Notes & Decisions
- **Manual Review**: Confirmation is a manual step; the system suggests (hints) but does not block confirmation even if overbooked (non-blocking MVP).
- **Room Allocation**: Confirmation transitions the status but does **not** yet assign specific Room Numbers (User selects rooms later in regular workflow).
