using System.Net;
using System.Net.Http.Json;
using CleanArchitecture.Application.Financials.Queries.GetReservationFinancialBreakdown;
using CleanArchitecture.Application.Financials.Queries.GetRevenueSummary;
using CleanArchitecture.Application.Reservations.Commands.CreateReservation;
using CleanArchitecture.Application.Reservations.Queries.GetReservations;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using NUnit.Framework;

namespace CleanArchitecture.Application.FunctionalTests.Financials;

using static Testing;

public class FinancialsTests : BaseTestFixture
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
        var response = await _client.GetAsync("/api/financials/revenue?from=2026-01-01&to=2026-01-02");
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized));
    }

    [Test]
    public async Task ShouldCalculateDeterministicBreakdown()
    {
        await ResetState();
        AddAuth();

        var roomType = new RoomType { Name = "Deluxe", Capacity = 2, DefaultRate = 150 };
        await AddAsync(roomType);
        var room1 = new Room { RoomNumber = "201", RoomTypeId = roomType.Id };
        var room2 = new Room { RoomNumber = "202", RoomTypeId = roomType.Id };
        await AddAsync(room1);
        await AddAsync(room2);

        // Stay Feb 1 to Feb 4 (3 nights)
        var checkIn = new DateTime(2026, 2, 1);
        var checkOut = new DateTime(2026, 2, 4);

        var command = new CreateReservationCommand
        {
            GuestName = "Financial Test",
            CheckInDate = checkIn,
            CheckOutDate = checkOut,
            Status = ReservationStatus.Confirmed,
            Lines = new List<CreateReservationLineCommand>
            {
                new() { RoomId = room1.Id, RatePerNight = 100 }, // Custom rate
                new() { RoomId = room2.Id } // Default rate (150)
            }
        };

        var createResponse = await _client.PostAsJsonAsync("/api/reservations", command);
        createResponse.EnsureSuccessStatusCode();
        var reservation = await createResponse.Content.ReadFromJsonAsync<ReservationDto>();

        // GET Breakdown
        var response = await _client.GetAsync($"/api/financials/reservations/{reservation!.Id}/breakdown");
        response.EnsureSuccessStatusCode();
        var breakdown = await response.Content.ReadFromJsonAsync<ReservationFinancialBreakdownDto>();

        Assert.That(breakdown!.Nights, Is.EqualTo(3));
        Assert.That(breakdown.TotalAmount, Is.EqualTo(750)); // (100*3) + (150*3) = 300 + 450 = 750
        Assert.That(breakdown.Lines.Count, Is.EqualTo(2));
        Assert.That(breakdown.Nightly.Count, Is.EqualTo(3));
        Assert.That(breakdown.Nightly[0].Amount, Is.EqualTo(250)); // 100 + 150
        Assert.That(breakdown.Nightly[0].Date, Is.EqualTo("2026-02-01"));
    }

    [Test]
    public async Task ShouldFilterRevenueByStatus()
    {
        await ResetState();
        AddAuth();

        var roomType = new RoomType { Name = "Std", Capacity = 2, DefaultRate = 100 };
        await AddAsync(roomType);
        var room = new Room { RoomNumber = "101", RoomTypeId = roomType.Id };
        await AddAsync(room);

        var date = new DateTime(2026, 5, 1);

        // 1. Confirmed (Included)
        var res1 = new Reservation { GuestName = "Conf", CheckInDate = date, CheckOutDate = date.AddDays(1), Status = ReservationStatus.Confirmed, TotalAmount = 100, Currency = "USD" };
        res1.Lines.Add(new ReservationLine { RoomId = room.Id, RoomTypeId = roomType.Id, RatePerNight = 100, Nights = 1, LineTotal = 100 });
        await AddAsync(res1);

        // 2. Draft (Excluded)
        var res2 = new Reservation { GuestName = "Draft", CheckInDate = date, CheckOutDate = date.AddDays(1), Status = ReservationStatus.Draft, TotalAmount = 100, Currency = "USD" };
        res2.Lines.Add(new ReservationLine { RoomId = room.Id, RoomTypeId = roomType.Id, RatePerNight = 100, Nights = 1, LineTotal = 100 });
        await AddAsync(res2);

        // 3. Cancelled (Excluded)
        var res3 = new Reservation { GuestName = "Cancel", CheckInDate = date, CheckOutDate = date.AddDays(1), Status = ReservationStatus.Cancelled, TotalAmount = 100, Currency = "USD" };
        res3.Lines.Add(new ReservationLine { RoomId = room.Id, RoomTypeId = roomType.Id, RatePerNight = 100, Nights = 1, LineTotal = 100 });
        await AddAsync(res3);

        // GET Revenue Summary
        var url = "/api/financials/revenue?from=2026-05-01&to=2026-05-01&mode=forecast";
        var response = await _client.GetAsync(url);
        response.EnsureSuccessStatusCode();
        var summary = await response.Content.ReadFromJsonAsync<RevenueSummaryDto>();

        Assert.That(summary!.TotalRevenue, Is.EqualTo(100), $"Expected 100 revenue but got {summary.TotalRevenue}");
        Assert.That(summary.Items.Count, Is.EqualTo(1));
        Assert.That(summary.Items[0].Revenue, Is.EqualTo(100));
    }

    [Test]
    public async Task ShouldGroupRevenueByRoomType()
    {
        await ResetState();
        AddAuth();

        var rt1 = new RoomType { Name = "Single", Capacity = 1, DefaultRate = 50 };
        var rt2 = new RoomType { Name = "Double", Capacity = 2, DefaultRate = 120 };
        await AddAsync(rt1);
        await AddAsync(rt2);

        var r1 = new Room { RoomNumber = "S1", RoomTypeId = rt1.Id };
        var r2 = new Room { RoomNumber = "D1", RoomTypeId = rt2.Id };
        await AddAsync(r1);
        await AddAsync(r2);

        var date = new DateTime(2026, 6, 1);
        var res = new Reservation { GuestName = "Mixed", CheckInDate = date, CheckOutDate = date.AddDays(1), Status = ReservationStatus.Confirmed, TotalAmount = 170, Currency = "USD" };
        res.Lines.Add(new ReservationLine { RoomId = r1.Id, RoomTypeId = rt1.Id, RatePerNight = 50, Nights = 1, LineTotal = 50 });
        res.Lines.Add(new ReservationLine { RoomId = r2.Id, RoomTypeId = rt2.Id, RatePerNight = 120, Nights = 1, LineTotal = 120 });
        await AddAsync(res);

        // GET Revenue Summary
        var response = await _client.GetAsync("/api/financials/revenue?from=2026-06-01&to=2026-06-01&mode=forecast&groupBy=roomType");
        response.EnsureSuccessStatusCode();
        var summary = await response.Content.ReadFromJsonAsync<RevenueSummaryDto>();

        Assert.That(summary!.TotalRevenue, Is.EqualTo(170));
        Assert.That(summary.Items.Any(x => x.Key == "Single" && x.Revenue == 50), Is.True);
        Assert.That(summary.Items.Any(x => x.Key == "Double" && x.Revenue == 120), Is.True);
    }
}