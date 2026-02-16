# Test Report: Phase 6.2 — PDF OCR Parsing Workflow

## Endpoint Summary
`POST /api/pdf-reservations/{id}/parse`

### Request Profile:
- **Method**: POST
- **URL**: `/api/pdf-reservations/{id}/parse`
- **Roles**: Owner, Receptionist (via `[Authorize]`)

## Implementation Details
- **IPdfReservationParser**: Defined an injectable interface in the Application layer to decouple parsing logic from the command handler.
- **BasicPdfReservationParser**: A fallback implementation in Infrastructure that returns a "Not Configured" error, ensuring the system doesn't crash if OCR is not set up.
- **Handler Logic**:
    - **Validation**: Ensures the reservation exists (404), is in `Draft` status, and originated from a `PDF` upload (409 Conflict).
    - **Path Resolution**: Extracts the internal storage path from the reservation notes (using markers set in Phase 6.1).
    - **Extraction & Mapping**: Calls the parser and updates the reservation's `GuestName`, `Phone`, `CheckInDate`, `CheckOutDate`, `TotalAmount`, and `Currency`.
    - **Marker persistence**: Updates notes with `[EXTRACTED]` data points and transitions `[PARSING_STATUS]` from `Pending` to either `Parsed` or `Failed`.

## Integration Tests
**Command**: `dotnet test tests\Application.FunctionalTests\Application.FunctionalTests.csproj --filter "PdfParsingTests"`

**Results**: **5 Passed**, 0 Failed.

### Covered Scenarios:
1. **Auth**: Blocked without valid token.
2. **Missing Reservation**: 404 response.
3. **Invalid State**: 409 response if not Draft or not PDF source.
4. **Successful Parsing**: Verified mapping of Guest name, phone, dates, price, and note markers.
5. **Failed Parsing**: Verified that failures are recorded in notes without changing reservation status.

## Example Extracted Notes (Success)
```text
[PDF_UPLOAD] File: my_booking.pdf | Internal Path: C:\App_Data\Uploads\abc.pdf
[EXTRACTED] CheckIn=2026-05-20
[EXTRACTED] CheckOut=2026-05-25
[EXTRACTED] RoomTypeHint=Suite
[EXTRACTED] TotalPrice=500.5 Currency=USD
[PARSING_STATUS] Parsed
```
