using System.Net;
using System.Net.Http.Json;
using CleanArchitecture.Application.Common.Exceptions;
using CleanArchitecture.Application.Reservations.Commands.CreateReservation;
using CleanArchitecture.Application.Reservations.Commands.UpdateReservation;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using NUnit.Framework;

namespace CleanArchitecture.Application.FunctionalTests.Reservations;

using static Testing;

public class ReservationsPastDateTests : BaseTestFixture
{
    private HttpClient _client = null!;

    [SetUp]
    public void SetUp()
    {
        _client = _factory.CreateClient();
        _client.DefaultRequestHeaders.Remove("SkipAuthentication");
    }

    [TearDown]
    public void TearDown()
    {
        _client.Dispose();
    }

    [Test]
    public async Task ShouldReturnBadRequestWhenCreatingWithPastDate()
    {
        await ResetState();

        var roomType = new RoomType { Name = "Standard", Capacity = 2, DefaultRate = 100 };
        await AddAsync(roomType);
        var room = new Room { RoomNumber = "101", RoomTypeId = roomType.Id };
        await AddAsync(room);

        var command = new CreateReservationCommand
        {
            GuestName = "Past Guest",
            CheckInDate = DateTime.Today.AddDays(-1),
            CheckOutDate = DateTime.Today.AddDays(1),
            Lines = new List<CreateReservationLineCommand>
            {
                new() { RoomId = room.Id }
            }
        };

        var response = await _client.PostAsJsonAsync("/api/reservations", command);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
        
        var error = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        var allErrors = string.Join(" ", error!.Errors?.SelectMany(e => e.Value) ?? Array.Empty<string>());
        Assert.That(allErrors, Contains.Substring("Cannot create reservation with a past check-in date."));
    }

    [Test]
    public async Task ShouldReturnBadRequestWhenUpdatingToPastDate()
    {
        await ResetState();

        var roomType = new RoomType { Name = "Standard", Capacity = 2, DefaultRate = 100 };
        await AddAsync(roomType);
        var room = new Room { RoomNumber = "101", RoomTypeId = roomType.Id };
        await AddAsync(room);

        var reservation = new Reservation 
        { 
            GuestName = "Normal Guest", 
            CheckInDate = DateTime.Today.AddDays(1), 
            CheckOutDate = DateTime.Today.AddDays(2),
            TotalAmount = 100,
            Currency = "USD"
        };
        reservation.Lines.Add(new ReservationLine { RoomId = room.Id, RoomTypeId = roomType.Id, RatePerNight = 100, Nights = 1, LineTotal = 100 });
        await AddAsync(reservation);

        var command = new UpdateReservationCommand
        {
            Id = reservation.Id,
            GuestName = "Normal Guest",
            CheckInDate = DateTime.Today.AddDays(-1), // Move to past
            CheckOutDate = DateTime.Today.AddDays(1),
            Lines = new List<CreateReservationLineCommand>
            {
                new() { RoomId = room.Id }
            }
        };

        var response = await _client.PutAsJsonAsync($"/api/reservations/{reservation.Id}", command);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
        
        var error = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        var allErrors = string.Join(" ", error!.Errors?.SelectMany(e => e.Value) ?? Array.Empty<string>());
        Assert.That(allErrors, Contains.Substring("Cannot create reservation with a past check-in date."));
    }

    [Test]
    public async Task ShouldReturnBadRequestWhenConfirmingPastReservation()
    {
        await ResetState();

        var roomType = new RoomType { Name = "Standard", Capacity = 2, DefaultRate = 100 };
        await AddAsync(roomType);
        var room = new Room { RoomNumber = "101", RoomTypeId = roomType.Id };
        await AddAsync(room);

        // Create a Draft reservation with past date (forced into DB as it bypasses command validation for this test setup)
        var reservation = new Reservation 
        { 
            GuestName = "Forgotten Draft", 
            CheckInDate = DateTime.Today.AddDays(-1), 
            CheckOutDate = DateTime.Today.AddDays(1),
            Status = ReservationStatus.Draft,
            TotalAmount = 100,
            Currency = "USD"
        };
        reservation.Lines.Add(new ReservationLine { RoomId = room.Id, RoomTypeId = roomType.Id, RatePerNight = 100, Nights = 2, LineTotal = 200 });
        await AddAsync(reservation);

        // Attempt to confirm
        var response = await _client.PostAsync($"/api/reservations/{reservation.Id}/confirm", null);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
        
        var error = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        var allErrors = string.Join(" ", error!.Errors?.SelectMany(e => e.Value) ?? Array.Empty<string>());
        Assert.That(allErrors, Contains.Substring("Cannot create reservation with a past check-in date."));
    }
}

public class ValidationProblemDetails
{
    public string? Title { get; set; }
    public string? Detail { get; set; }
    public int? Status { get; set; }
    public IDictionary<string, string[]>? Errors { get; set; }
}
