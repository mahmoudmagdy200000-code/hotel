using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Application.Reservations.Commands.PdfUpload;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using NUnit.Framework;

namespace CleanArchitecture.Application.FunctionalTests.Reservations;

using static Testing;

public class PdfBatchUploadTests : BaseTestFixture
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
    public async Task UploadBatch_ShouldReturn401WhenUnauthenticated()
    {
        await ResetState();
        AddAuth(false);

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent("fake pdf content"u8.ToArray());
        fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/pdf");
        content.Add(fileContent, "files", "test1.pdf");

        var response = await _client.PostAsync("/api/pdf-reservations/upload-batch", content);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized));
    }

    [Test]
    public async Task UploadBatch_ShouldCreateMultipleDraftReservations()
    {
        await ResetState();
        AddAuth(true);

        using var content = new MultipartFormDataContent();

        // Add 3 valid PDF files
        for (int i = 1; i <= 3; i++)
        {
            var pdfBytes = System.Text.Encoding.UTF8.GetBytes($"fake pdf content {i}");
            var fileContent = new ByteArrayContent(pdfBytes);
            fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/pdf");
            content.Add(fileContent, "files", $"booking_{i}.pdf");
        }

        // Act
        var response = await _client.PostAsync("/api/pdf-reservations/upload-batch", content);

        // Assert
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<PdfBatchUploadResultDto>();

        Assert.That(result, Is.Not.Null);
        Assert.That(result!.TotalCount, Is.EqualTo(3));
        Assert.That(result.SuccessCount, Is.EqualTo(3));
        Assert.That(result.FailedCount, Is.EqualTo(0));
        Assert.That(result.Items, Has.Count.EqualTo(3));

        // Verify each item
        for (int i = 0; i < 3; i++)
        {
            var item = result.Items[i];
            Assert.That(item.Index, Is.EqualTo(i));
            Assert.That(item.Status, Is.EqualTo("Created"));
            Assert.That(item.ParsingStatus, Is.EqualTo("Pending"));
            Assert.That(item.ReservationId, Is.GreaterThan(0));
            Assert.That(item.FileName, Is.EqualTo($"booking_{i + 1}.pdf"));

            // Verify database
            var reservation = await FindAsync<Reservation>(item.ReservationId!.Value);
            Assert.That(reservation, Is.Not.Null);
            Assert.That(reservation!.Status, Is.EqualTo(ReservationStatus.Draft));
            Assert.That(reservation.Source, Is.EqualTo(ReservationSource.PDF));
            Assert.That(reservation.Notes, Does.Contain("[PDF_UPLOAD]"));
        }
    }

    [Test]
    public async Task UploadBatch_ShouldReturnPartialFailures()
    {
        await ResetState();
        AddAuth(true);

        using var content = new MultipartFormDataContent();

        // Add 1 valid PDF
        var validPdf = "fake pdf content"u8.ToArray();
        var validContent = new ByteArrayContent(validPdf);
        validContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/pdf");
        content.Add(validContent, "files", "valid.pdf");

        // Add 1 invalid file (not PDF)
        var invalidContent = new ByteArrayContent("not a pdf"u8.ToArray());
        invalidContent.Headers.ContentType = MediaTypeHeaderValue.Parse("text/plain");
        content.Add(invalidContent, "files", "invalid.txt");

        // Add another valid PDF
        var validPdf2 = "fake pdf content 2"u8.ToArray();
        var validContent2 = new ByteArrayContent(validPdf2);
        validContent2.Headers.ContentType = MediaTypeHeaderValue.Parse("application/pdf");
        content.Add(validContent2, "files", "valid2.pdf");

        // Act
        var response = await _client.PostAsync("/api/pdf-reservations/upload-batch", content);

        // Assert - should return 200 OK with partial results
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<PdfBatchUploadResultDto>();

        Assert.That(result, Is.Not.Null);
        Assert.That(result!.TotalCount, Is.EqualTo(3));
        Assert.That(result.SuccessCount, Is.EqualTo(2));
        Assert.That(result.FailedCount, Is.EqualTo(1));

        // Verify items maintain input order
        Assert.That(result.Items[0].Index, Is.EqualTo(0));
        Assert.That(result.Items[0].Status, Is.EqualTo("Created"));
        Assert.That(result.Items[0].FileName, Is.EqualTo("valid.pdf"));

        Assert.That(result.Items[1].Index, Is.EqualTo(1));
        Assert.That(result.Items[1].Status, Is.EqualTo("Failed"));
        Assert.That(result.Items[1].FileName, Is.EqualTo("invalid.txt"));
        Assert.That(result.Items[1].ErrorCode, Is.EqualTo("INVALID_FILE_TYPE"));

        Assert.That(result.Items[2].Index, Is.EqualTo(2));
        Assert.That(result.Items[2].Status, Is.EqualTo("Created"));
        Assert.That(result.Items[2].FileName, Is.EqualTo("valid2.pdf"));
    }

    [Test]
    public async Task UploadBatch_ShouldEnforceMaxCount()
    {
        await ResetState();
        AddAuth(true);

        using var content = new MultipartFormDataContent();

        // Add 21 files (exceeds max of 20)
        for (int i = 1; i <= 21; i++)
        {
            var pdfBytes = System.Text.Encoding.UTF8.GetBytes($"fake pdf content {i}");
            var fileContent = new ByteArrayContent(pdfBytes);
            fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/pdf");
            content.Add(fileContent, "files", $"booking_{i}.pdf");
        }

        // Act
        var response = await _client.PostAsync("/api/pdf-reservations/upload-batch", content);

        // Assert - should still return 200 but all items failed
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<PdfBatchUploadResultDto>();

        Assert.That(result, Is.Not.Null);
        Assert.That(result!.TotalCount, Is.EqualTo(21));
        Assert.That(result.SuccessCount, Is.EqualTo(0));
        Assert.That(result.FailedCount, Is.EqualTo(21));

        // All should have same error code
        Assert.That(result.Items.All(i => i.ErrorCode == "BATCH_SIZE_EXCEEDED"), Is.True);
    }
}
