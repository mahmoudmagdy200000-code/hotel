# Test Report: Phase 6.1 — PDF Upload as Pending Reservation

## Endpoint Summary
`POST /api/pdf-reservations/upload`

### Request Profile:
- **Method**: POST
- **Content-Type**: `multipart/form-data`
- **Body**: `file` (PDF file)
- **Roles**: Owner, Receptionist (and Administrator)

## Business Rules Implemented
- **Validation**:
  - File must be a PDF (extension check).
  - Max file size: 10MB.
- **Storage**:
  - Files are stored locally in `backend/App_Data/Uploads` with a unique name (Guid prefix).
- **Reservation Creation**:
  - **Status**: `Draft` (always).
  - **Source**: `PDF` (ReservationSource enum).
  - **Guest**: Placeholder guest "PDF Guest" created.
  - **Availability**: NO rooms assigned, NO availability impact.
  - **Notes**: Includes `[PDF_UPLOAD]` marker and original filename.
- **Response**: Returns `PendingReservationCreatedDto` with `parsingStatus = "Pending"`.

## Integration Tests
**Command**: `dotnet test tests\Application.FunctionalTests\Application.FunctionalTests.csproj --filter "PdfUploadTests"`

**Results**: **3 Passed**, 0 Failed.

### Covered Scenarios:
1. **Auth**: Returns 401 Unauthorized when no token provided.
2. **Success**: Draft reservation created, file saved, database verified (Notes, Status, Source).
3. **Validation**: Returns 400 Bad Request if a non-PDF file is uploaded.

## Example Request/Response
**POST** `/api/pdf-reservations/upload` (Multipart)

**Response (200 OK)**:
```json
{
  "reservationId": 123,
  "bookingNumber": "PDF-20260125-ABCD",
  "status": "Draft",
  "createdAtUtc": "2026-01-25T11:45:00Z",
  "parsingStatus": "Pending",
  "message": "PDF uploaded successfully and reservation created as Draft. OCR parsing is pending."
}
```
