using System.Net;
using System.Net.Http.Json;
using CleanArchitecture.Application.Dashboard.Queries.GetDashboard;
using CleanArchitecture.Application.Reservations.Commands.CreateReservation;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using NUnit.Framework;

namespace CleanArchitecture.Application.FunctionalTests.Dashboard;

using static Testing;

public class DashboardTests : BaseTestFixture
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
        var response = await _client.GetAsync("/api/dashboard");
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized));
    }

    [Test]
    public async Task ShouldCalculateTotalsCorrectly()
    {
        await ResetState();
        AddAuth();

        // 1. Setup 2 Rooms
        var rt = new RoomType { Name = "Basic", Capacity = 2 };
        await AddAsync(rt);
        var r1 = new Room { RoomNumber = "101", RoomTypeId = rt.Id };
        var r2 = new Room { RoomNumber = "102", RoomTypeId = rt.Id };
        await AddAsync(r1);
        await AddAsync(r2);

        // 2. Reservation: 2 nights (Feb 1, Feb 2), CheckedOut.
        // Rate = 100 per night. Total = 200.
        // Occupies 1 room.
        var checkIn = new DateTime(2026, 2, 1);
        var checkOut = new DateTime(2026, 2, 3);
        
        var res = new Reservation 
        { 
            GuestName = "R1", CheckInDate = checkIn, CheckOutDate = checkOut, 
            Status = ReservationStatus.CheckedOut,
            TotalAmount = 200
        };
        res.Lines.Add(new ReservationLine { RoomId = r1.Id, RoomTypeId = rt.Id, RatePerNight = 100, Nights = 2, LineTotal = 200 });
        await AddAsync(res);

        // 3. Query Dashboard (Actual)
        var response = await _client.GetAsync("/api/dashboard?from=2026-02-01&to=2026-02-03&mode=actual");
        if (!response.IsSuccessStatusCode)
        {
            var content = await response.Content.ReadAsStringAsync();
            Assert.Fail($"Request failed with {response.StatusCode}. Content: {content}");
        }
        var dashboard = await response.Content.ReadFromJsonAsync<DashboardDto>();
        var summary = dashboard!.Summary;

        // 4. Verify
        // Nights = 2. Total Rooms = 2. Supply = 4.
        // Sold = 2 (1 room * 2 nights).
        // Revenue = 200.
        // ADR = 200 / 2 = 100.
        // RevPAR = 200 / 4 = 50.
        
        Assert.That(summary.NightsCount, Is.EqualTo(2));
        Assert.That(summary.TotalRooms, Is.EqualTo(2));
        Assert.That(summary.SupplyRoomNights, Is.EqualTo(4));
        Assert.That(summary.SoldRoomNights, Is.EqualTo(2));
        Assert.That(summary.TotalRevenue, Is.EqualTo(200));
        Assert.That(summary.Adr, Is.EqualTo(100));
        Assert.That(summary.RevPar, Is.EqualTo(50));
    }

    [Test]
    public async Task ShouldReturn200WithDefaults()
    {
        AddAuth();
        var response = await _client.GetAsync("/api/dashboard");
        if (!response.IsSuccessStatusCode)
        {
            var content = await response.Content.ReadAsStringAsync();
            Assert.Fail($"Defaults request failed with {response.StatusCode}. Content: {content}");
        }
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK));
    }

    [Test]
    public async Task ShouldRespectModePolicy()
    {
        await ResetState();
        AddAuth();

        var rt = new RoomType { Name = "Basic", Capacity = 2 };
        await AddAsync(rt);
        var r1 = new Room { RoomNumber = "101", RoomTypeId = rt.Id };
        var r2 = new Room { RoomNumber = "102", RoomTypeId = rt.Id };
        await AddAsync(r1);
        await AddAsync(r2);

        var date = new DateTime(2026, 3, 1);

        // Res A: CheckedOut (Counts in Actual & Forecast) - 100 revenue
        var resA = new Reservation { GuestName = "A", CheckInDate = date, CheckOutDate = date.AddDays(1), Status = ReservationStatus.CheckedOut, TotalAmount = 100 };
        resA.Lines.Add(new ReservationLine { RoomId = r1.Id, RoomTypeId = rt.Id, RatePerNight = 100, LineTotal = 100 });
        await AddAsync(resA);

        // Res B: Confirmed (Forecast only) - 150 revenue
        var resB = new Reservation { GuestName = "B", CheckInDate = date, CheckOutDate = date.AddDays(1), Status = ReservationStatus.Confirmed, TotalAmount = 150 };
        resB.Lines.Add(new ReservationLine { RoomId = r2.Id, RoomTypeId = rt.Id, RatePerNight = 150, LineTotal = 150 });
        await AddAsync(resB);

        // 1. Actual Mode
        var respActual = await _client.GetAsync($"/api/dashboard?from=2026-03-01&to=2026-03-02&mode=actual");
        if (!respActual.IsSuccessStatusCode)
        {
            var content = await respActual.Content.ReadAsStringAsync();
            Assert.Fail($"Actual mode request failed with {respActual.StatusCode}. Content: {content}");
        }
        var dbActual = await respActual.Content.ReadFromJsonAsync<DashboardDto>();
        Assert.That(dbActual!.Summary.SoldRoomNights, Is.EqualTo(1));
        Assert.That(dbActual.Summary.TotalRevenue, Is.EqualTo(100));

        // 2. Forecast Mode
        var respForecast = await _client.GetAsync($"/api/dashboard?from=2026-03-01&to=2026-03-02&mode=forecast");
        if (!respForecast.IsSuccessStatusCode)
        {
            var content = await respForecast.Content.ReadAsStringAsync();
            Assert.Fail($"Forecast mode request failed with {respForecast.StatusCode}. Content: {content}");
        }
        var dbForecast = await respForecast.Content.ReadFromJsonAsync<DashboardDto>();
        Assert.That(dbForecast!.Summary.SoldRoomNights, Is.EqualTo(2));
        Assert.That(dbForecast.Summary.TotalRevenue, Is.EqualTo(250)); // 100 + 150
        Assert.That(dbForecast.Summary.Adr, Is.EqualTo(125)); // 250 / 2
    }

    [Test]
    public async Task ShouldAlignSeriesByDay()
    {
        await ResetState();
        AddAuth();

        var rt = new RoomType { Name = "Basic", Capacity = 2 };
        await AddAsync(rt);
        var r1 = new Room { RoomNumber = "101", RoomTypeId = rt.Id };
        await AddAsync(r1);

        // 2 nights with different rates
        var start = new DateTime(2026, 4, 1);
        var res = new Reservation 
        { 
            CheckInDate = start, CheckOutDate = start.AddDays(2), 
            Status = ReservationStatus.Confirmed, TotalAmount = 300 
        };
        // Line implies constant rate usually, but we sum daily. 
        // If we want varying daily rates, we usually need multiple lines or advanced logic.
        // For now, let's assume flat rate 150 per night on the line.
        res.Lines.Add(new ReservationLine { RoomId = r1.Id, RoomTypeId = rt.Id, RatePerNight = 150, Nights = 2 });
        await AddAsync(res);

        // Request
        var response = await _client.GetAsync($"/api/dashboard?from=2026-04-01&to=2026-04-03&mode=forecast");
        if (!response.IsSuccessStatusCode)
        {
            var content = await response.Content.ReadAsStringAsync();
            Assert.Fail($"Request failed with {response.StatusCode}. Content: {content}");
        }
        var dashboard = await response.Content.ReadFromJsonAsync<DashboardDto>();

        Assert.That(dashboard!.ByDay.Count, Is.EqualTo(2));
        
        var day1 = dashboard.ByDay[0];
        Assert.That(day1.Date, Is.EqualTo("2026-04-01"));
        Assert.That(day1.Revenue, Is.EqualTo(150));
        Assert.That(day1.OccupiedRooms, Is.EqualTo(1));

        var day2 = dashboard.ByDay[1];
        Assert.That(day2.Date, Is.EqualTo("2026-04-02"));
        Assert.That(day2.Revenue, Is.EqualTo(150));
    }

    [Test]
    public async Task ShouldBreakdownByRoomType()
    {
        await ResetState();
        AddAuth();

        var rt1 = new RoomType { Name = "Single", Capacity = 1 };
        var rt2 = new RoomType { Name = "Double", Capacity = 2 };
        await AddAsync(rt1);
        await AddAsync(rt2);
        
        var r1 = new Room { RoomNumber = "S1", RoomTypeId = rt1.Id };
        var r2 = new Room { RoomNumber = "D1", RoomTypeId = rt2.Id };
        await AddAsync(r1);
        await AddAsync(r2);

        var date = new DateTime(2026, 5, 1);
        
        // Single Room Res: 50
        var res1 = new Reservation { CheckInDate = date, CheckOutDate = date.AddDays(1), Status = ReservationStatus.Confirmed, TotalAmount = 50 };
        res1.Lines.Add(new ReservationLine { RoomId = r1.Id, RoomTypeId = rt1.Id, RatePerNight = 50 });
        await AddAsync(res1);

        // Double Room Res: 100
        var res2 = new Reservation { CheckInDate = date, CheckOutDate = date.AddDays(1), Status = ReservationStatus.Confirmed, TotalAmount = 100 };
        res2.Lines.Add(new ReservationLine { RoomId = r2.Id, RoomTypeId = rt2.Id, RatePerNight = 100 });
        await AddAsync(res2);

        var response = await _client.GetAsync($"/api/dashboard?from=2026-05-01&to=2026-05-02&mode=forecast&includeRoomTypeBreakdown=true");
        var dashboard = await response.Content.ReadFromJsonAsync<DashboardDto>();

        Assert.That(dashboard!.ByRoomType, Is.Not.Null);
        Assert.That(dashboard.ByRoomType!.Count, Is.GreaterThanOrEqualTo(2));

        var singleKpi = dashboard.ByRoomType.FirstOrDefault(x => x.RoomTypeName == "Single");
        var doubleKpi = dashboard.ByRoomType.FirstOrDefault(x => x.RoomTypeName == "Double");

        Assert.That(singleKpi!.SoldRoomNights, Is.EqualTo(1));
        Assert.That(singleKpi.Revenue, Is.EqualTo(50));
        Assert.That(singleKpi.Adr, Is.EqualTo(50));

        Assert.That(doubleKpi!.SoldRoomNights, Is.EqualTo(1));
        Assert.That(doubleKpi.Revenue, Is.EqualTo(100));
        Assert.That(doubleKpi.Adr, Is.EqualTo(100));
    }
}
