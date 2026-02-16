using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CleanArchitecture.Application.Reservations.Commands.PdfUpload;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using NUnit.Framework;

namespace CleanArchitecture.Application.FunctionalTests.Reservations;

using static Testing;

public class PdfUploadTests : BaseTestFixture
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
        await ResetState();
        AddAuth(false);

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent("fake pdf content"u8.ToArray());
        fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/pdf");
        content.Add(fileContent, "file", "test.pdf");

        var response = await _client.PostAsync("/api/pdf-reservations/upload", content);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized));
    }

    [Test]
    public async Task ShouldCreateDraftReservationOnSuccessfulUpload()
    {
        await ResetState();
        AddAuth(true);

        using var content = new MultipartFormDataContent();
        var pdfBytes = "fake pdf content"u8.ToArray();
        var fileContent = new ByteArrayContent(pdfBytes);
        fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/pdf");
        content.Add(fileContent, "file", "my_booking.pdf");

        // Act
        var response = await _client.PostAsync("/api/pdf-reservations/upload", content);

        // Assert
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<PendingReservationCreatedDto>();

        Assert.That(result, Is.Not.Null);
        Assert.That(result!.Status, Is.EqualTo(ReservationStatus.Draft.ToString()));
        Assert.That(result.ParsingStatus, Is.EqualTo("Pending"));
        Assert.That(result.BookingNumber, Does.StartWith("PDF-"));

        // Verify Database
        var reservation = await FindAsync<Reservation>(result.ReservationId);
        Assert.That(reservation, Is.Not.Null);
        Assert.That(reservation!.Status, Is.EqualTo(ReservationStatus.Draft));
        Assert.That(reservation.GuestName, Is.EqualTo("PDF Guest"));
        Assert.That(reservation.Source, Is.EqualTo(ReservationSource.PDF));
        Assert.That(reservation.Notes, Does.Contain("[PDF_UPLOAD]"));
        Assert.That(reservation.Notes, Does.Contain("my_booking.pdf"));
    }

    [Test]
    public async Task ShouldReturn400WhenFileIsNotPdf()
    {
        await ResetState();
        AddAuth(true);

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent("not a pdf"u8.ToArray());
        fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse("text/plain");
        content.Add(fileContent, "file", "test.txt");

        // Act
        var response = await _client.PostAsync("/api/pdf-reservations/upload", content);

        // Assert
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
    }
}
