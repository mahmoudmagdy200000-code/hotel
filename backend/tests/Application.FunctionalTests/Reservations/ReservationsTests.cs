using System.Net;
using System.Net.Http.Json;
using CleanArchitecture.Application.Reservations.Commands.CreateReservation;
using CleanArchitecture.Application.Reservations.Commands.UpdateReservation;
using CleanArchitecture.Application.Reservations.Queries.GetReservations;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using NUnit.Framework;

namespace CleanArchitecture.Application.FunctionalTests.Reservations;

using static Testing;

public class ReservationsTests : BaseTestFixture
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
    public async Task ShouldRequireMinimumAuthentication()
    {
        AddAuth(false);

        var response = await _client.GetAsync("/api/reservations");

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized));
    }

    [Test]
    public async Task ShouldCreateReservationWithOneLine()
    {
        await ResetState();
        AddAuth();

        var roomType = new RoomType { Name = "Standard", Capacity = 2, DefaultRate = 100 };
        await AddAsync(roomType);
        var room = new Room { RoomNumber = "101", RoomTypeId = roomType.Id };
        await AddAsync(room);

        var command = new CreateReservationCommand
        {
            GuestName = "Test Guest",
            CheckInDate = DateTime.Now.AddDays(1).Date,
            CheckOutDate = DateTime.Now.AddDays(3).Date,
            Lines = new List<CreateReservationLineCommand>
            {
                new() { RoomId = room.Id }
            }
        };

        var response = await _client.PostAsJsonAsync("/api/reservations", command);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Created));
        
        var result = await response.Content.ReadFromJsonAsync<ReservationDto>();
        Assert.That(result!.GuestName, Is.EqualTo(command.GuestName));
        Assert.That(result.Lines.Count, Is.EqualTo(1));
        Assert.That(result.TotalAmount, Is.EqualTo(200)); // 100 * 2 nights
    }

    [Test]
    public async Task ShouldCreateReservationWithMultiRoom()
    {
        await ResetState();
        AddAuth();

        var roomType = new RoomType { Name = "Standard", Capacity = 2, DefaultRate = 100 };
        await AddAsync(roomType);
        var room1 = new Room { RoomNumber = "101", RoomTypeId = roomType.Id };
        var room2 = new Room { RoomNumber = "102", RoomTypeId = roomType.Id };
        await AddAsync(room1);
        await AddAsync(room2);

        var command = new CreateReservationCommand
        {
            GuestName = "Multi Room Guest",
            CheckInDate = DateTime.Now.AddDays(1).Date,
            CheckOutDate = DateTime.Now.AddDays(2).Date,
            Lines = new List<CreateReservationLineCommand>
            {
                new() { RoomId = room1.Id },
                new() { RoomId = room2.Id }
            }
        };

        var response = await _client.PostAsJsonAsync("/api/reservations", command);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Created));
        
        var result = await response.Content.ReadFromJsonAsync<ReservationDto>();
        Assert.That(result!.Lines.Count, Is.EqualTo(2));
        Assert.That(result.TotalAmount, Is.EqualTo(200)); // (100+100) * 1 night
    }

    [Test]
    public async Task ShouldReturnBadRequestWhenOverlapping()
    {
        await ResetState();
        AddAuth();

        var roomType = new RoomType { Name = "Standard", Capacity = 2, DefaultRate = 100 };
        await AddAsync(roomType);
        var room = new Room { RoomNumber = "101", RoomTypeId = roomType.Id };
        await AddAsync(room);

        // Existing reservation: Feb 1 to Feb 5
        var existing = new Reservation
        {
            GuestName = "Existing",
            CheckInDate = new DateTime(2026, 2, 1),
            CheckOutDate = new DateTime(2026, 2, 5),
            Status = ReservationStatus.Confirmed,
            TotalAmount = 400,
            Currency = "USD"
        };
        existing.Lines.Add(new ReservationLine { RoomId = room.Id, RoomTypeId = roomType.Id, RatePerNight = 100, Nights = 4, LineTotal = 400 });
        await AddAsync(existing);

        // Overlapping attempt: Feb 3 to Feb 6
        var command = new CreateReservationCommand
        {
            GuestName = "New Guest",
            CheckInDate = new DateTime(2026, 2, 3),
            CheckOutDate = new DateTime(2026, 2, 6),
            Status = ReservationStatus.Confirmed,
            Lines = new List<CreateReservationLineCommand>
            {
                new() { RoomId = room.Id }
            }
        };

        var response = await _client.PostAsJsonAsync("/api/reservations", command);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
    }

    [Test]
    public async Task ShouldSucceedWhenOverlapWithCancelled()
    {
        await ResetState();
        AddAuth();

        var roomType = new RoomType { Name = "Standard", Capacity = 2, DefaultRate = 100 };
        await AddAsync(roomType);
        var room = new Room { RoomNumber = "101", RoomTypeId = roomType.Id };
        await AddAsync(room);

        // Existing CANCELLED reservation: Feb 1 to Feb 5
        var existing = new Reservation
        {
            GuestName = "Cancelled",
            CheckInDate = new DateTime(2026, 2, 1),
            CheckOutDate = new DateTime(2026, 2, 5),
            Status = ReservationStatus.Cancelled,
            TotalAmount = 400,
            Currency = "USD"
        };
        existing.Lines.Add(new ReservationLine { RoomId = room.Id, RoomTypeId = roomType.Id, RatePerNight = 100, Nights = 4, LineTotal = 400 });
        await AddAsync(existing);

        // Same dates but SHOULD succeed because previous is cancelled
        var command = new CreateReservationCommand
        {
            GuestName = "New Guest",
            CheckInDate = new DateTime(2026, 2, 1),
            CheckOutDate = new DateTime(2026, 2, 5),
            Lines = new List<CreateReservationLineCommand>
            {
                new() { RoomId = room.Id }
            }
        };

        var response = await _client.PostAsJsonAsync("/api/reservations", command);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Created));
    }

    [Test]
    public async Task ShouldCancelReservation()
    {
        await ResetState();
        AddAuth();

        var roomType = new RoomType { Name = "Standard", Capacity = 2 };
        await AddAsync(roomType);
        var room = new Room { RoomNumber = "101", RoomTypeId = roomType.Id };
        await AddAsync(room);

        var reservation = new Reservation 
        { 
            GuestName = "To Cancel", 
            CheckInDate = DateTime.Now, 
            CheckOutDate = DateTime.Now.AddDays(1), 
            Status = ReservationStatus.Confirmed,
            TotalAmount = 100,
            Currency = "USD"
        };
        reservation.Lines.Add(new ReservationLine 
        { 
            RoomId = room.Id, 
            RoomTypeId = roomType.Id,
            RatePerNight = 100,
            LineTotal = 100,
            Nights = 1
        });
        await AddAsync(reservation);

        var response = await _client.PostAsync($"/api/reservations/{reservation.Id}/cancel", null);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.NoContent));

        var entity = await FindAsync<Reservation>(reservation.Id);
        Assert.That(entity!.Status, Is.EqualTo(ReservationStatus.Cancelled));
    }

    [Test]
    public async Task ShouldGetReservationByIdWithLines()
    {
        await ResetState();
        AddAuth();

        var roomType = new RoomType { Name = "Standard", Capacity = 2 };
        await AddAsync(roomType);
        var room = new Room { RoomNumber = "101", RoomTypeId = roomType.Id };
        await AddAsync(room);

        var reservation = new Reservation 
        { 
            GuestName = "Detail Test", 
            CheckInDate = DateTime.Now, 
            CheckOutDate = DateTime.Now.AddDays(1),
            TotalAmount = 100,
            Currency = "USD"
        };
        reservation.Lines.Add(new ReservationLine 
        { 
            RoomId = room.Id, 
            RoomTypeId = roomType.Id,
            RatePerNight = 100,
            LineTotal = 100,
            Nights = 1
        });
        await AddAsync(reservation);

        var response = await _client.GetAsync($"/api/reservations/{reservation.Id}");

        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<ReservationDto>();

        Assert.That(result!.Lines.Count, Is.EqualTo(1));
        Assert.That(result.Lines[0].RoomNumber, Is.EqualTo("101"));
    }
}
