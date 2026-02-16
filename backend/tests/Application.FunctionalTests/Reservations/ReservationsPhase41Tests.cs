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

public class ReservationsPhase41Tests : BaseTestFixture
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
    public async Task ShouldAllowOverlappingDraftReservations()
    {
        await ResetState();
        AddAuth();

        var roomType = new RoomType { Name = "Standard", Capacity = 2, DefaultRate = 100 };
        await AddAsync(roomType);
        var room = new Room { RoomNumber = "101", RoomTypeId = roomType.Id };
        await AddAsync(room);

        var checkIn = DateTime.Now.AddDays(1).Date;
        var checkOut = DateTime.Now.AddDays(3).Date;

        var command1 = new CreateReservationCommand
        {
            GuestName = "Draft 1",
            CheckInDate = checkIn,
            CheckOutDate = checkOut,
            Status = ReservationStatus.Draft,
            Lines = new List<CreateReservationLineCommand> { new() { RoomId = room.Id } }
        };

        var command2 = new CreateReservationCommand
        {
            GuestName = "Draft 2",
            CheckInDate = checkIn,
            CheckOutDate = checkOut,
            Status = ReservationStatus.Draft,
            Lines = new List<CreateReservationLineCommand> { new() { RoomId = room.Id } }
        };

        var response1 = await _client.PostAsJsonAsync("/api/reservations", command1);
        var response2 = await _client.PostAsJsonAsync("/api/reservations", command2);

        Assert.That(response1.StatusCode, Is.EqualTo(HttpStatusCode.Created));
        Assert.That(response2.StatusCode, Is.EqualTo(HttpStatusCode.Created));
    }

    [Test]
    public async Task ShouldEnforceAvailabilityOnConfirm()
    {
        await ResetState();
        AddAuth();

        var roomType = new RoomType { Name = "Standard", Capacity = 2, DefaultRate = 100 };
        await AddAsync(roomType);
        var room = new Room { RoomNumber = "101", RoomTypeId = roomType.Id };
        await AddAsync(room);

        var checkIn = DateTime.UtcNow.AddDays(1).Date;
        var checkOut = DateTime.UtcNow.AddDays(3).Date;

        // Existing Confirmed
        var confirmed = new Reservation
        {
            GuestName = "Confirmed",
            CheckInDate = checkIn,
            CheckOutDate = checkOut,
            Status = ReservationStatus.Confirmed,
            TotalAmount = 200,
            Currency = "USD"
        };
        confirmed.Lines.Add(new ReservationLine { RoomId = room.Id, RoomTypeId = roomType.Id, RatePerNight = 100, Nights = 2, LineTotal = 200 });
        await AddAsync(confirmed);

        // New Draft
        var draft = new Reservation
        {
            GuestName = "Draft",
            CheckInDate = checkIn,
            CheckOutDate = checkOut,
            Status = ReservationStatus.Draft,
            TotalAmount = 200,
            Currency = "USD"
        };
        draft.Lines.Add(new ReservationLine { RoomId = room.Id, RoomTypeId = roomType.Id, RatePerNight = 100, Nights = 2, LineTotal = 200 });
        await AddAsync(draft);

        // Attempt to confirm draft
        var response = await _client.PostAsync($"/api/reservations/{draft.Id}/confirm", null);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
    }

    [Test]
    public async Task ShouldPerformFullTransitionFlow()
    {
        await ResetState();
        AddAuth();

        var roomType = new RoomType { Name = "Standard", Capacity = 2, DefaultRate = 100 };
        await AddAsync(roomType);
        var room = new Room { RoomNumber = "101", RoomTypeId = roomType.Id };
        await AddAsync(room);

        var draft = new Reservation
        {
            GuestName = "Guest", CheckInDate = DateTime.Now.AddDays(1), CheckOutDate = DateTime.Now.AddDays(2),
            Status = ReservationStatus.Draft, TotalAmount = 100, Currency = "USD"
        };
        draft.Lines.Add(new ReservationLine { RoomId = room.Id, RoomTypeId = roomType.Id, RatePerNight = 100, Nights = 1, LineTotal = 100 });
        await AddAsync(draft);

        // 1. Confirm
        var res1 = await _client.PostAsync($"/api/reservations/{draft.Id}/confirm", null);
        Assert.That(res1.StatusCode, Is.EqualTo(HttpStatusCode.NoContent));

        // 2. Check-In
        var res2 = await _client.PostAsync($"/api/reservations/{draft.Id}/checkin", null);
        Assert.That(res2.StatusCode, Is.EqualTo(HttpStatusCode.NoContent));

        // 3. Check-Out
        var res3 = await _client.PostAsync($"/api/reservations/{draft.Id}/checkout", null);
        Assert.That(res3.StatusCode, Is.EqualTo(HttpStatusCode.NoContent));

        var final = await FindAsync<Reservation>(draft.Id);
        Assert.That(final!.Status, Is.EqualTo(ReservationStatus.CheckedOut));
        Assert.That(final.ConfirmedAt, Is.Not.Null);
        Assert.That(final.CheckedInAt, Is.Not.Null);
        Assert.That(final.CheckedOutAt, Is.Not.Null);
    }

    [Test]
    public async Task ShouldReturnBadRequestForInvalidTransition()
    {
        await ResetState();
        AddAuth();

        var roomType = new RoomType { Name = "Standard", Capacity = 2 };
        await AddAsync(roomType);
        var room = new Room { RoomNumber = "101", RoomTypeId = roomType.Id };
        await AddAsync(room);

        var draft = new Reservation
        {
            GuestName = "Guest", CheckInDate = DateTime.Now.AddDays(1), CheckOutDate = DateTime.Now.AddDays(2),
            Status = ReservationStatus.Draft, TotalAmount = 100, Currency = "USD"
        };
        draft.Lines.Add(new ReservationLine { RoomId = room.Id, RoomTypeId = roomType.Id });
        await AddAsync(draft);

        // Skip confirm, direct check-in from draft should fail
        var response = await _client.PostAsync($"/api/reservations/{draft.Id}/checkin", null);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
    }

    [Test]
    public async Task ShouldRestrictEditsInCheckedInStatus()
    {
        await ResetState();
        AddAuth();

        var roomType = new RoomType { Name = "Standard", Capacity = 2, DefaultRate = 100 };
        await AddAsync(roomType);
        var room1 = new Room { RoomNumber = "101", RoomTypeId = roomType.Id };
        var room2 = new Room { RoomNumber = "102", RoomTypeId = roomType.Id };
        await AddAsync(room1);
        await AddAsync(room2);

        var res = new Reservation
        {
            GuestName = "CheckedIn", CheckInDate = DateTime.Now, CheckOutDate = DateTime.Now.AddDays(1),
            Status = ReservationStatus.CheckedIn, TotalAmount = 100, Currency = "USD"
        };
        res.Lines.Add(new ReservationLine { RoomId = room1.Id, RoomTypeId = roomType.Id, RatePerNight = 100, Nights = 1, LineTotal = 100 });
        await AddAsync(res);

        // Attempt to change room while checked-in
        var command = new UpdateReservationCommand
        {
            Id = res.Id,
            GuestName = "New Name",
            CheckInDate = res.CheckInDate,
            CheckOutDate = res.CheckOutDate,
            Lines = new List<CreateReservationLineCommand> { new() { RoomId = room2.Id } }
        };

        var response = await _client.PutAsJsonAsync($"/api/reservations/{res.Id}", command);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
    }

    [Test]
    public async Task ShouldFreeAvailabilityOnCancel()
    {
        await ResetState();
        AddAuth();

        var roomType = new RoomType { Name = "Standard", Capacity = 2, DefaultRate = 100 };
        await AddAsync(roomType);
        var room = new Room { RoomNumber = "101", RoomTypeId = roomType.Id };
        await AddAsync(room);

        var checkIn = DateTime.UtcNow.AddDays(1).Date;
        var checkOut = DateTime.UtcNow.AddDays(3).Date;

        var res = new Reservation
        {
            GuestName = "To Cancel", CheckInDate = checkIn, CheckOutDate = checkOut,
            Status = ReservationStatus.Confirmed, TotalAmount = 200, Currency = "USD"
        };
        res.Lines.Add(new ReservationLine { RoomId = room.Id, RoomTypeId = roomType.Id, RatePerNight = 100, Nights = 2, LineTotal = 200 });
        await AddAsync(res);

        // Cancel it
        await _client.PostAsync($"/api/reservations/{res.Id}/cancel", null);

        // Now create another one same dates
        var command = new CreateReservationCommand
        {
            GuestName = "New Guest",
            CheckInDate = checkIn,
            CheckOutDate = checkOut,
            Status = ReservationStatus.Confirmed,
            Lines = new List<CreateReservationLineCommand> { new() { RoomId = room.Id } }
        };

        var response = await _client.PostAsJsonAsync("/api/reservations", command);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Created));
    }

    [Test]
    public async Task ShouldRestrictEditsInTerminalStatus()
    {
        await ResetState();
        AddAuth();

        var roomType = new RoomType { Name = "Standard", Capacity = 2 };
        await AddAsync(roomType);
        var room = new Room { RoomNumber = "101", RoomTypeId = roomType.Id };
        await AddAsync(room);

        var res = new Reservation
        {
            GuestName = "Cancelled", CheckInDate = DateTime.Now, CheckOutDate = DateTime.Now.AddDays(1),
            Status = ReservationStatus.Cancelled, TotalAmount = 100, Currency = "USD"
        };
        res.Lines.Add(new ReservationLine { RoomId = room.Id, RoomTypeId = roomType.Id });
        await AddAsync(res);

        var command = new UpdateReservationCommand
        {
            Id = res.Id,
            GuestName = "Attempted Edit",
            CheckInDate = res.CheckInDate,
            CheckOutDate = res.CheckOutDate,
            Lines = new List<CreateReservationLineCommand> { new() { RoomId = room.Id } }
        };

        var response = await _client.PutAsJsonAsync($"/api/reservations/{res.Id}", command);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
    }
}
