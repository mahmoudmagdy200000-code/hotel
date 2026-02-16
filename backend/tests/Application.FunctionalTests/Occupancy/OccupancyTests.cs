using System.Net;
using System.Net.Http.Json;
using CleanArchitecture.Application.Occupancy.Queries.GetOccupancy;
using CleanArchitecture.Application.Reservations.Commands.CreateReservation;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using NUnit.Framework;

namespace CleanArchitecture.Application.FunctionalTests.Occupancy;

using static Testing;

public class OccupancyTests : BaseTestFixture
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
        var response = await _client.GetAsync("/api/occupancy");
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized));
    }

    [Test]
    public async Task ShouldMeasureStayNightAllocationCorrectly()
    {
        await ResetState();
        AddAuth();

        // 1. Setup Rooms (Total = 2)
        var rt = new RoomType { Name = "Standard", Capacity = 2 };
        await AddAsync(rt);
        var room101 = new Room { RoomNumber = "101", RoomTypeId = rt.Id };
        await AddAsync(room101);
        await AddAsync(new Room { RoomNumber = "102", RoomTypeId = rt.Id });

        // 2. Reservation: 3 nights (Feb 1, 2, 3), Checkout Feb 4
        // Occupies 1 room ("101")
        var checkIn = new DateTime(2026, 2, 1);
        var checkOut = new DateTime(2026, 2, 4);
        
        var res = new Reservation 
        { 
            GuestName = "Guest", 
            CheckInDate = checkIn, 
            CheckOutDate = checkOut, 
            Status = ReservationStatus.Confirmed 
        };
        res.Lines.Add(new ReservationLine { RoomId = room101.Id, RoomTypeId = rt.Id });
        await AddAsync(res);

        // 3. Query Occupancy for Feb 1 to Feb 4
        var response = await _client.GetAsync("/api/occupancy?from=2026-02-01&to=2026-02-04&mode=forecast");
        response.EnsureSuccessStatusCode();
        var summary = await response.Content.ReadFromJsonAsync<OccupancySummaryDto>();

        // 4. Verification
        // Supply = 2 rooms * 3 nights = 6
        // Sold = 1 room * 3 nights = 3
        // Rate = 0.5
        Assert.That(summary!.TotalRooms, Is.EqualTo(2));
        Assert.That(summary.SupplyRoomNights, Is.EqualTo(6));
        Assert.That(summary.SoldRoomNights, Is.EqualTo(3));
        Assert.That(summary.OccupancyRateOverall, Is.EqualTo(0.5));
        
        Assert.That(summary.ByDay.Count, Is.EqualTo(3));
        foreach(var day in summary.ByDay)
        {
            Assert.That(day.OccupiedRooms, Is.EqualTo(1));
            Assert.That(day.TotalRooms, Is.EqualTo(2));
            Assert.That(day.OccupancyRate, Is.EqualTo(0.5));
        }
    }

    [Test]
    public async Task ShouldFilterByModeActualVsForecast()
    {
        await ResetState();
        AddAuth();

        var rt = new RoomType { Name = "Standard", Capacity = 2 };
        await AddAsync(rt);
        var room = new Room { RoomNumber = "101", RoomTypeId = rt.Id };
        await AddAsync(room);

        var date = new DateTime(2026, 3, 1);

        // A: CheckedOut (Counts in Actual & Forecast)
        var resA = new Reservation { GuestName = "A", CheckInDate = date, CheckOutDate = date.AddDays(1), Status = ReservationStatus.CheckedOut };
        resA.Lines.Add(new ReservationLine { RoomId = room.Id, RoomTypeId = rt.Id });
        await AddAsync(resA);

        // B: Confirmed (Counts in Forecast only)
        // Overlapping same day implies overbooking if same room, but let's assume filtering logic logic handles list correctly.
        // Actually physically same room same day is double booking, allowed in DB generally if checks passed or seeded directly.
        // But for occupancy counts, we "Count distinct RoomId". So if same room is booked twice, it counts as 1 occupied room.
        // To test separation, let's use DIFFERENT rooms or different dates? 
        // Prompt says "Actual mode includes only CheckedOut". 
        // Let's use same date, different room to see counts clearly.
        var room2 = new Room { RoomNumber = "102", RoomTypeId = rt.Id };
        await AddAsync(room2);

        var resB = new Reservation { GuestName = "B", CheckInDate = date, CheckOutDate = date.AddDays(1), Status = ReservationStatus.Confirmed };
        resB.Lines.Add(new ReservationLine { RoomId = room2.Id, RoomTypeId = rt.Id });
        await AddAsync(resB);

        // Test Actual
        var respActual = await _client.GetAsync($"/api/occupancy?from=2026-03-01&to=2026-03-01&mode=actual");
        var actual = await respActual.Content.ReadFromJsonAsync<OccupancySummaryDto>();
        Assert.That(actual!.SoldRoomNights, Is.EqualTo(1)); // Only A

        // Test Forecast
        var respForecast = await _client.GetAsync($"/api/occupancy?from=2026-03-01&to=2026-03-01&mode=forecast");
        var forecast = await respForecast.Content.ReadFromJsonAsync<OccupancySummaryDto>();
        Assert.That(forecast!.SoldRoomNights, Is.EqualTo(2)); // A + B
    }

    [Test]
    public async Task ShouldExcludeDraftCancelledNoShow()
    {
        await ResetState();
        AddAuth();

        var rt = new RoomType { Name = "Standard", Capacity = 2 };
        await AddAsync(rt);
        var room = new Room { RoomNumber = "101", RoomTypeId = rt.Id };
        await AddAsync(room);

        var date = new DateTime(2026, 4, 1);

        // Draft
        var res1 = new Reservation { GuestName = "Draft", CheckInDate = date, CheckOutDate = date.AddDays(1), Status = ReservationStatus.Draft };
        res1.Lines.Add(new ReservationLine { RoomId = room.Id, RoomTypeId = rt.Id });
        await AddAsync(res1);

        // Cancelled
        var res2 = new Reservation { GuestName = "Cancelled", CheckInDate = date, CheckOutDate = date.AddDays(1), Status = ReservationStatus.Cancelled };
        res2.Lines.Add(new ReservationLine { RoomId = room.Id, RoomTypeId = rt.Id });
        await AddAsync(res2);

        // Forecast Mode
        var response = await _client.GetAsync($"/api/occupancy?from=2026-04-01&to=2026-04-01&mode=forecast");
        var summary = await response.Content.ReadFromJsonAsync<OccupancySummaryDto>();

        Assert.That(summary!.SoldRoomNights, Is.EqualTo(0));
    }

    [Test]
    public async Task ShouldGroupOccupancyByRoomType()
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
        var res = new Reservation { GuestName = "Grouped", CheckInDate = date, CheckOutDate = date.AddDays(1), Status = ReservationStatus.Confirmed };
        
        // 1 Single, 1 Double
        res.Lines.Add(new ReservationLine { RoomId = r1.Id, RoomTypeId = rt1.Id });
        res.Lines.Add(new ReservationLine { RoomId = r2.Id, RoomTypeId = rt2.Id });
        await AddAsync(res);

        var response = await _client.GetAsync($"/api/occupancy?from=2026-05-01&to=2026-05-01&mode=forecast&groupBy=both");
        var summary = await response.Content.ReadFromJsonAsync<OccupancySummaryDto>();

        Assert.That(summary!.SoldRoomNights, Is.EqualTo(2));
        Assert.That(summary.ByRoomTypeByDay.Count, Is.GreaterThan(0));
        
        var s1 = summary.ByRoomTypeByDay.FirstOrDefault(x => x.RoomTypeName == "Single");
        var d1 = summary.ByRoomTypeByDay.FirstOrDefault(x => x.RoomTypeName == "Double");

        Assert.That(s1, Is.Not.Null);
        Assert.That(s1!.OccupiedRoomsOfType, Is.EqualTo(1));

        Assert.That(d1, Is.Not.Null);
        Assert.That(d1!.OccupiedRoomsOfType, Is.EqualTo(1));
    }
}
