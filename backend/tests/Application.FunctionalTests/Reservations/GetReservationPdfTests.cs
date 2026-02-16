using CleanArchitecture.Application.Common.Exceptions;
using CleanArchitecture.Application.Reservations.Queries.GetReservationPdf;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using Shouldly;
using NUnit.Framework;

namespace CleanArchitecture.Application.FunctionalTests.Reservations.Queries;

using static Testing;

public class GetReservationPdfTests : BaseTestFixture
{
    [Test]
    public async Task ShouldThrowNotFoundExceptionWhenReservationDoesNotExist()
    {
        var query = new GetReservationPdfQuery(99999);

        await Should.ThrowAsync<CleanArchitecture.Application.Common.Exceptions.NotFoundException>(() => SendAsync(query));
    }

    [Test]
    public async Task ShouldThrowNotFoundExceptionWhenNoPdfMarkerInNotes()
    {
        var reservation = new Reservation
        {
            GuestName = "No PDF Guest",
            Status = ReservationStatus.Draft,
            Notes = "Just some regular notes"
        };

        await AddAsync(reservation);

        var query = new GetReservationPdfQuery(reservation.Id);

        await Should.ThrowAsync<CleanArchitecture.Application.Common.Exceptions.NotFoundException>(() => SendAsync(query));
    }

    [Test]
    public async Task ShouldThrowNotFoundExceptionWhenFileDoesNotExistOnDisk()
    {
        var reservation = new Reservation
        {
            GuestName = "Missing File Guest",
            Status = ReservationStatus.Draft,
            Notes = "[PDF_UPLOAD] File: missing.pdf | Internal Path: C:\\App_Data\\Uploads\\non-existent.pdf"
        };

        await AddAsync(reservation);

        var query = new GetReservationPdfQuery(reservation.Id);

        await Should.ThrowAsync<CleanArchitecture.Application.Common.Exceptions.NotFoundException>(() => SendAsync(query));
    }

    [Test]
    public async Task ShouldReturnFileResponseWhenFileExists()
    {
        // 1. Setup a fake file in a temporary location that mimics App_Data/Uploads
        var tempFolder = Path.Combine(Path.GetTempPath(), "App_Data", "Uploads");
        if (!Directory.Exists(tempFolder)) Directory.CreateDirectory(tempFolder);
        
        var fileName = "test.pdf";
        var filePath = Path.Combine(tempFolder, $"{Guid.NewGuid()}_{fileName}");
        await File.WriteAllBytesAsync(filePath, new byte[] { 1, 2, 3, 4 });

        var reservation = new Reservation
        {
            GuestName = "Existing File Guest",
            Status = ReservationStatus.Draft,
            Notes = $"[PDF_UPLOAD] File: {fileName} | Internal Path: {filePath}"
        };

        await AddAsync(reservation);

        var query = new GetReservationPdfQuery(reservation.Id);

        var result = await SendAsync(query);

        result.ShouldNotBeNull();
        result.ContentType.ShouldBe("application/pdf");
        result.FileName.ShouldBe($"reservation-{reservation.Id}.pdf");
        
        using (result.Stream)
        {
            using (var ms = new MemoryStream())
            {
                await result.Stream.CopyToAsync(ms);
                ms.ToArray().ShouldBe(new byte[] { 1, 2, 3, 4 });
            }
        }
        
        // Cleanup
        if (File.Exists(filePath)) File.Delete(filePath);
    }

    [Test]
    public async Task ShouldThrowSecurityExceptionWhenPathIsOutsideUploads()
    {
        var reservation = new Reservation
        {
            GuestName = "Hacker Guest",
            Status = ReservationStatus.Draft,
            Notes = "[PDF_UPLOAD] File: secret.txt | Internal Path: C:\\Windows\\System32\\drivers\\etc\\hosts"
        };

        await AddAsync(reservation);

        var query = new GetReservationPdfQuery(reservation.Id);

        var ex = await Should.ThrowAsync<InvalidOperationException>(() => SendAsync(query));
        ex.Message.ShouldContain("Security violation");
    }
}
