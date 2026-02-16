using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Application.Reservations.Commands.PdfUpload;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using CleanArchitecture.Web.Endpoints;
using NUnit.Framework;

namespace CleanArchitecture.Application.FunctionalTests.Reservations;

using static Testing;

public class PdfBatchParseTests : BaseTestFixture
{
    private HttpClient _client = null!;

    [SetUp]
    public void SetUp()
    {
        _client = _factory.CreateClient();
    }

    [TearDown]
    public void TearDown()
    {
        _client.Dispose();
    }

    private void AddAuth(bool authenticated = true)
    {
        _client.DefaultRequestHeaders.Remove("SkipAuthentication");
        if (!authenticated)
        {
            _client.DefaultRequestHeaders.Add("SkipAuthentication", "true");
        }
    }

    private async Task<int> CreatePdfReservationAsync(string fileName = "test.pdf")
    {
        var res = new Reservation
        {
            GuestName = "PDF Guest",
            Source = ReservationSource.PDF,
            Status = ReservationStatus.Draft,
            CheckInDate = DateTime.Today.AddDays(1),
            CheckOutDate = DateTime.Today.AddDays(2),
            Currency = "USD",
            Notes = $"[PDF_UPLOAD] File: {fileName} | Internal Path: C:\\uploads\\{fileName}"
        };
        await AddAsync(res);
        return res.Id;
    }

    [Test]
    public async Task ParseBatch_ShouldReturn401WhenUnauthenticated()
    {
        await ResetState();
        AddAuth(false);

        var request = new PdfBatchParseRequestDto { ReservationIds = new List<int> { 1, 2, 3 } };
        var response = await _client.PostAsJsonAsync("/api/pdf-reservations/parse-batch", request);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized));
    }

    [Test]
    public async Task ParseBatch_ShouldParseMultiplePendingReservations()
    {
        await ResetState();
        AddAuth(true);

        // Create 3 PDF reservations
        var id1 = await CreatePdfReservationAsync("booking1.pdf");
        var id2 = await CreatePdfReservationAsync("booking2.pdf");
        var id3 = await CreatePdfReservationAsync("booking3.pdf");

        // Setup Fake Parser for success
        FakePdfReservationParser.NextResult = new PdfParseOutput
        {
            Success = true,
            Data = new ExtractedPdfData
            {
                GuestName = "Extracted Guest",
                Phone = "123456789",
                CheckIn = new DateOnly(2026, 5, 20),
                CheckOut = new DateOnly(2026, 5, 25),
                TotalPrice = 500.50m,
                Currency = "USD",
                RoomTypeHint = "Suite"
            }
        };

        // Act
        var request = new PdfBatchParseRequestDto { ReservationIds = new List<int> { id1, id2, id3 } };
        var response = await _client.PostAsJsonAsync("/api/pdf-reservations/parse-batch", request);

        // Assert
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<PdfBatchParseResultDto>();

        Assert.That(result, Is.Not.Null);
        Assert.That(result!.TotalCount, Is.EqualTo(3));
        Assert.That(result.SuccessCount, Is.EqualTo(3));
        Assert.That(result.FailedCount, Is.EqualTo(0));

        // Verify each item
        foreach (var item in result.Items)
        {
            Assert.That(item.Status, Is.EqualTo("Parsed"));
            Assert.That(item.ParsingStatus, Is.EqualTo("Parsed"));
            Assert.That(item.Extracted, Is.Not.Null);
            Assert.That(item.Extracted!.GuestName, Is.EqualTo("Extracted Guest"));
        }

        // Verify database
        foreach (var id in new[] { id1, id2, id3 })
        {
            var reservation = await FindAsync<Reservation>(id);
            Assert.That(reservation, Is.Not.Null);
            Assert.That(reservation!.GuestName, Is.EqualTo("Extracted Guest"));
            Assert.That(reservation.Notes, Does.Contain("[PDF_EXTRACTED]"));
            Assert.That(reservation.Notes, Does.Contain("[PARSING_STATUS] Parsed"));
        }
    }

    [Test]
    public async Task ParseBatch_ShouldReturnPartialFailures()
    {
        await ResetState();
        AddAuth(true);

        // Create 2 valid PDF reservations
        var id1 = await CreatePdfReservationAsync("valid1.pdf");
        var id2 = await CreatePdfReservationAsync("valid2.pdf");

        // Create 1 reservation that will fail (no PDF path in notes)
        var failRes = new Reservation
        {
            GuestName = "No Path Guest",
            Source = ReservationSource.PDF,
            Status = ReservationStatus.Draft,
            CheckInDate = DateTime.Today.AddDays(1),
            CheckOutDate = DateTime.Today.AddDays(2),
            Currency = "USD",
            Notes = "[PDF_UPLOAD] File: broken.pdf" // Missing Internal Path
        };
        await AddAsync(failRes);
        var id3 = failRes.Id;

        // Setup Fake Parser for success (only called for valid reservations)
        FakePdfReservationParser.NextResult = new PdfParseOutput
        {
            Success = true,
            Data = new ExtractedPdfData
            {
                GuestName = "Extracted Guest",
                CheckIn = new DateOnly(2026, 5, 20),
                CheckOut = new DateOnly(2026, 5, 25),
            }
        };

        // Act
        var request = new PdfBatchParseRequestDto { ReservationIds = new List<int> { id1, id3, id2 } };
        var response = await _client.PostAsJsonAsync("/api/pdf-reservations/parse-batch", request);

        // Assert - should return 200 with partial results
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<PdfBatchParseResultDto>();

        Assert.That(result, Is.Not.Null);
        Assert.That(result!.TotalCount, Is.EqualTo(3));
        Assert.That(result.SuccessCount, Is.EqualTo(2));
        Assert.That(result.FailedCount, Is.EqualTo(1));

        // Verify items maintain input order
        Assert.That(result.Items[0].ReservationId, Is.EqualTo(id1));
        Assert.That(result.Items[0].Status, Is.EqualTo("Parsed"));

        Assert.That(result.Items[1].ReservationId, Is.EqualTo(id3));
        Assert.That(result.Items[1].Status, Is.EqualTo("Failed"));
        Assert.That(result.Items[1].ErrorCode, Is.EqualTo("NO_PDF_PATH"));

        Assert.That(result.Items[2].ReservationId, Is.EqualTo(id2));
        Assert.That(result.Items[2].Status, Is.EqualTo("Parsed"));

        // Verify database - failed one should have failure marker
        var failedReservation = await FindAsync<Reservation>(id3);
        Assert.That(failedReservation!.Notes, Does.Contain("[PDF_PARSE_FAILED]"));
        Assert.That(failedReservation.Notes, Does.Contain("[PARSING_STATUS] Failed"));
    }

    [Test]
    public async Task ParseBatch_ShouldSkipNonDraftOrWrongSource()
    {
        await ResetState();
        AddAuth(true);

        // Create 1 valid PDF reservation
        var id1 = await CreatePdfReservationAsync("valid.pdf");

        // Create 1 Confirmed reservation (wrong status)
        var confirmedRes = new Reservation
        {
            GuestName = "Confirmed Guest",
            Source = ReservationSource.PDF,
            Status = ReservationStatus.Confirmed, // Not Draft
            CheckInDate = DateTime.Today.AddDays(1),
            CheckOutDate = DateTime.Today.AddDays(2),
            Currency = "USD",
            Notes = "[PDF_UPLOAD] File: confirmed.pdf | Internal Path: C:\\uploads\\confirmed.pdf"
        };
        await AddAsync(confirmedRes);
        var id2 = confirmedRes.Id;

        // Create 1 Manual source reservation (wrong source)
        var manualRes = new Reservation
        {
            GuestName = "Manual Guest",
            Source = ReservationSource.Manual, // Not PDF
            Status = ReservationStatus.Draft,
            CheckInDate = DateTime.Today.AddDays(1),
            CheckOutDate = DateTime.Today.AddDays(2),
            Currency = "USD"
        };
        await AddAsync(manualRes);
        var id3 = manualRes.Id;

        // Setup Fake Parser for success
        FakePdfReservationParser.NextResult = new PdfParseOutput
        {
            Success = true,
            Data = new ExtractedPdfData { GuestName = "Extracted Guest" }
        };

        // Act
        var request = new PdfBatchParseRequestDto { ReservationIds = new List<int> { id1, id2, id3 } };
        var response = await _client.PostAsJsonAsync("/api/pdf-reservations/parse-batch", request);

        // Assert - should return 200 with partial results
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<PdfBatchParseResultDto>();

        Assert.That(result, Is.Not.Null);
        Assert.That(result!.TotalCount, Is.EqualTo(3));
        Assert.That(result.SuccessCount, Is.EqualTo(1));
        Assert.That(result.FailedCount, Is.EqualTo(2));

        // Verify items
        Assert.That(result.Items[0].ReservationId, Is.EqualTo(id1));
        Assert.That(result.Items[0].Status, Is.EqualTo("Parsed"));

        Assert.That(result.Items[1].ReservationId, Is.EqualTo(id2));
        Assert.That(result.Items[1].Status, Is.EqualTo("Failed"));
        Assert.That(result.Items[1].ErrorCode, Is.EqualTo("NOT_ELIGIBLE"));

        Assert.That(result.Items[2].ReservationId, Is.EqualTo(id3));
        Assert.That(result.Items[2].Status, Is.EqualTo("Failed"));
        Assert.That(result.Items[2].ErrorCode, Is.EqualTo("NOT_ELIGIBLE"));
    }

    [Test]
    public async Task ParseBatch_ShouldHandleNotFoundReservations()
    {
        await ResetState();
        AddAuth(true);

        // Create 1 valid reservation
        var id1 = await CreatePdfReservationAsync("valid.pdf");
        
        // Use non-existent ID
        var nonExistentId = 99999;

        // Setup Fake Parser for success
        FakePdfReservationParser.NextResult = new PdfParseOutput
        {
            Success = true,
            Data = new ExtractedPdfData { GuestName = "Extracted Guest" }
        };

        // Act
        var request = new PdfBatchParseRequestDto { ReservationIds = new List<int> { id1, nonExistentId } };
        var response = await _client.PostAsJsonAsync("/api/pdf-reservations/parse-batch", request);

        // Assert
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<PdfBatchParseResultDto>();

        Assert.That(result, Is.Not.Null);
        Assert.That(result!.TotalCount, Is.EqualTo(2));
        Assert.That(result.SuccessCount, Is.EqualTo(1));
        Assert.That(result.FailedCount, Is.EqualTo(1));

        Assert.That(result.Items[0].Status, Is.EqualTo("Parsed"));
        Assert.That(result.Items[1].Status, Is.EqualTo("Failed"));
        Assert.That(result.Items[1].ErrorCode, Is.EqualTo("NOT_FOUND"));
    }

    [Test]
    public async Task ParseBatch_ShouldHandleParserFailures()
    {
        await ResetState();
        AddAuth(true);

        // Create 1 PDF reservation
        var id1 = await CreatePdfReservationAsync("bad_quality.pdf");

        // Setup Fake Parser for failure
        FakePdfReservationParser.NextResult = new PdfParseOutput
        {
            Success = false,
            Errors = new List<string> { "Bad quality", "No dates found" },
            ErrorCode = "OCR_EXTRACTION_FAILED",
            FailureStep = "TextExtraction",
            ErrorMessage = "Could not extract text from PDF"
        };

        // Act
        var request = new PdfBatchParseRequestDto { ReservationIds = new List<int> { id1 } };
        var response = await _client.PostAsJsonAsync("/api/pdf-reservations/parse-batch", request);

        // Assert - should return 200 with failed item (not 422)
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<PdfBatchParseResultDto>();

        Assert.That(result, Is.Not.Null);
        Assert.That(result!.TotalCount, Is.EqualTo(1));
        Assert.That(result.SuccessCount, Is.EqualTo(0));
        Assert.That(result.FailedCount, Is.EqualTo(1));

        Assert.That(result.Items[0].Status, Is.EqualTo("Failed"));
        Assert.That(result.Items[0].ParsingStatus, Is.EqualTo("Failed"));
        Assert.That(result.Items[0].ErrorCode, Is.EqualTo("OCR_EXTRACTION_FAILED"));

        // Verify database
        var reservation = await FindAsync<Reservation>(id1);
        Assert.That(reservation!.Notes, Does.Contain("[PDF_PARSE_FAILED]"));
        Assert.That(reservation.Notes, Does.Contain("[PARSING_STATUS] Failed"));
    }
}
