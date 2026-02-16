using System.Net;
using System.Net.Http.Json;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Application.Reservations.Commands.PdfUpload;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using NUnit.Framework;

namespace CleanArchitecture.Application.FunctionalTests.Reservations;

using static Testing;

public class PdfParsingTests : BaseTestFixture
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

    [Test]
    public async Task ShouldReturn401WhenUnauthenticated()
    {
        AddAuth(false);
        var response = await _client.PostAsync("/api/pdf-reservations/1/parse", null);
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized));
    }

    [Test]
    public async Task Parse_ShouldReturn404_WhenReservationDoesNotExist()
    {
        AddAuth();
        var response = await _client.PostAsync("/api/pdf-reservations/9999/parse", null);
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.NotFound));
    }

    [Test]
    public async Task Parse_ShouldReturn409_WhenSourceIsNotPdf()
    {
        await ResetState();
        AddAuth();

        var res = new Reservation
        {
            GuestName = "Manual Guest",
            Source = ReservationSource.Manual,
            Status = ReservationStatus.Draft,
            CheckInDate = DateTime.Today,
            CheckOutDate = DateTime.Today.AddDays(1),
            Currency = "USD"
        };
        await AddAsync(res);

        var response = await _client.PostAsync($"/api/pdf-reservations/{res.Id}/parse", null);
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Conflict));
    }

    [Test]
    public async Task Parse_ShouldUpdateReservation_OnSuccess()
    {
        await ResetState();
        AddAuth();

        var res = new Reservation
        {
            GuestName = "PDF Guest",
            Source = ReservationSource.PDF,
            Status = ReservationStatus.Draft,
            CheckInDate = DateTime.Today,
            CheckOutDate = DateTime.Today.AddDays(1),
            Currency = "USD",
            Notes = "[PDF_UPLOAD] File: some.pdf | Internal Path: C:\\uploads\\some.pdf"
        };
        await AddAsync(res);

        // Setup Fake Parser
        FakePdfReservationParser.NextResult = new PdfParseOutput
        {
            Success = true,
            Data = new ExtractedPdfData
            {
                GuestName = "Extracted Name",
                Phone = "123456789",
                CheckIn = new DateOnly(2026, 5, 20),
                CheckOut = new DateOnly(2026, 5, 25),
                TotalPrice = 500.50m,
                Currency = "USD",
                RoomTypeHint = "Suite"
            }
        };

        // Act
        var response = await _client.PostAsync($"/api/pdf-reservations/{res.Id}/parse", null);

        // Assert
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<PdfParsingResultDto>();

        Assert.That(result!.ParsingStatus, Is.EqualTo("Parsed"));
        Assert.That(result.Extracted!.GuestName, Is.EqualTo("Extracted Name"));

        // Verify Database
        var updated = await FindAsync<Reservation>(res.Id);
        Assert.That(updated!.GuestName, Is.EqualTo("Extracted Name"));
        Assert.That(updated.Phone, Is.EqualTo("123456789"));
        Assert.That(updated.CheckInDate, Is.EqualTo(new DateTime(2026, 5, 20)));
        Assert.That(updated.TotalAmount, Is.EqualTo(500.50m));
        Assert.That(updated.Notes, Does.Contain("[PARSING_STATUS] Parsed"));
        Assert.That(updated.Notes, Does.Contain("[PDF_EXTRACTED] RoomTypeHint=Suite"));
    }

    [Test]
    public async Task Parse_ShouldRecordFailure_InNotes()
    {
        await ResetState();
        AddAuth();

        var res = new Reservation
        {
            GuestName = "PDF Guest",
            Source = ReservationSource.PDF,
            Status = ReservationStatus.Draft,
            CheckInDate = DateTime.Today,
            CheckOutDate = DateTime.Today.AddDays(1),
            Currency = "USD",
            Notes = "[PDF_UPLOAD] File: some.pdf | Internal Path: C:\\uploads\\some.pdf"
        };
        await AddAsync(res);

        // Setup Fake Parser Failure
        FakePdfReservationParser.NextResult = new PdfParseOutput
        {
            Success = false,
            Errors = new List<string> { "Bad quality", "No dates found" },
            ErrorCode = "OCR_EXTRACTION_FAILED",
            FailureStep = "TextExtraction"
        };

        // Act
        var response = await _client.PostAsync($"/api/pdf-reservations/{res.Id}/parse", null);

        // Assert - Parse failures return 422 with ProblemDetails
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.UnprocessableEntity));

        // Verify Database - notes should be updated even on failure
        var updated = await FindAsync<Reservation>(res.Id);
        Assert.That(updated!.Status, Is.EqualTo(ReservationStatus.Draft)); // remains draft
        Assert.That(updated.Notes, Does.Contain("[PARSING_STATUS] Failed"));
    }
}
