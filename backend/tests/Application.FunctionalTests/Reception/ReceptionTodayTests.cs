using System.Net;
using System.Net.Http.Json;
using CleanArchitecture.Application.Reception.Queries.GetReceptionToday;
using CleanArchitecture.Application.Reservations.Commands.CreateReservation;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using NUnit.Framework;

namespace CleanArchitecture.Application.FunctionalTests.Reception;

using static Testing;

public class ReceptionTodayTests : BaseTestFixture
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
        var response = await _client.GetAsync("/api/reception/today?date=2026-01-25");
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized));
    }

    [Test]
    public async Task ShouldClassifyReservationsCorrectly()
    {
        await ResetState();
        AddAuth();

        var rt = new RoomType { Name = "Basic", Capacity = 2 };
        await AddAsync(rt);
        var room = new Room { RoomNumber = "101", RoomTypeId = rt.Id };
        await AddAsync(room); // Not strictly needed to assign rooms but good

        var targetDate = new DateTime(2026, 1, 25);

        // A: Arrival (Confirmed, Starts Today)
        var resA = new Reservation { 
            BookingNumber = "A", GuestName = "Arrival", 
            CheckInDate = targetDate, CheckOutDate = targetDate.AddDays(2), 
            Status = ReservationStatus.Confirmed 
        };
        await AddAsync(resA);

        // B: InHouse (CheckedIn, Started Yesterday, Ends Tomorrow)
        var resB = new Reservation { 
            BookingNumber = "B", GuestName = "InHouse", 
            CheckInDate = targetDate.AddDays(-1), CheckOutDate = targetDate.AddDays(1), 
            Status = ReservationStatus.CheckedIn 
        };
        await AddAsync(resB);

        // C: Departure (CheckedIn, Ends Today)
        var resC = new Reservation { 
            BookingNumber = "C", GuestName = "Departure", 
            CheckInDate = targetDate.AddDays(-5), CheckOutDate = targetDate, 
            Status = ReservationStatus.CheckedIn 
        };
        await AddAsync(resC);

        // D: Draft (Excluded)
        var resD = new Reservation { 
            BookingNumber = "D", GuestName = "Draft", 
            CheckInDate = targetDate, CheckOutDate = targetDate.AddDays(1), 
            Status = ReservationStatus.Draft 
        };
        await AddAsync(resD);

        // E: Cancelled (Excluded)
        var resE = new Reservation { 
            BookingNumber = "E", GuestName = "Cancelled", 
            CheckInDate = targetDate, CheckOutDate = targetDate.AddDays(1), 
            Status = ReservationStatus.Cancelled 
        };
        await AddAsync(resE);

        // Act
        var response = await _client.GetAsync($"/api/reception/today?date=2026-01-25");
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<ReceptionTodayDto>();

        // Assert
        Assert.That(result!.Date, Is.EqualTo("2026-01-25"));
        
        Assert.That(result.Summary.ArrivalsCount, Is.EqualTo(1));
        Assert.That(result.Arrivals.Count, Is.EqualTo(1));
        Assert.That(result.Arrivals[0].BookingNumber, Is.EqualTo("A"));

        Assert.That(result.Summary.InHouseCount, Is.EqualTo(1));
        Assert.That(result.InHouse.Count, Is.EqualTo(1));
        Assert.That(result.InHouse[0].BookingNumber, Is.EqualTo("B"));

        Assert.That(result.Summary.DeparturesCount, Is.EqualTo(1));
        Assert.That(result.Departures.Count, Is.EqualTo(1));
        Assert.That(result.Departures[0].BookingNumber, Is.EqualTo("C"));
    }

    [Test]
    public async Task ShouldOrderDeterministically()
    {
        await ResetState();
        AddAuth();

        var date = new DateTime(2026, 2, 1);

        // 1. Z (Late Alphabet)
        var res1 = new Reservation { BookingNumber = "Z", GuestName = "Zeta", CheckInDate = date, CheckOutDate = date.AddDays(1), Status = ReservationStatus.Confirmed };
        await AddAsync(res1);

        // 2. A (Early Alphabet)
        var res2 = new Reservation { BookingNumber = "A", GuestName = "Alpha", CheckInDate = date, CheckOutDate = date.AddDays(1), Status = ReservationStatus.Confirmed };
        await AddAsync(res2);

        var response = await _client.GetAsync($"/api/reception/today?date=2026-02-01");
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<ReceptionTodayDto>();

        Assert.That(result!.Arrivals.Count, Is.EqualTo(2));
        Assert.That(result.Arrivals[0].BookingNumber, Is.EqualTo("A"));
        Assert.That(result.Arrivals[1].BookingNumber, Is.EqualTo("Z"));
    }
}
