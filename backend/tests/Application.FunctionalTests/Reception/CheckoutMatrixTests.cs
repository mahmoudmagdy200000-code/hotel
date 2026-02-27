using System.Net;
using System.Net.Http.Json;
using CleanArchitecture.Application.Financials.Queries.GetRevenueSummary;
using CleanArchitecture.Application.Occupancy.Queries.GetOccupancy;
using CleanArchitecture.Application.Reservations.Commands.ReceptionActions;
using CleanArchitecture.Application.Reservations.Queries.GetReservations;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using NUnit.Framework;

namespace CleanArchitecture.Application.FunctionalTests.Reception;

using static Testing;

public class CheckoutMatrixTests : BaseTestFixture
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

    private void AddAuth()
    {
        _client.DefaultRequestHeaders.Remove("SkipAuthentication");
    }

    [Test]
    public async Task CheckoutMatrix_Verification()
    {
        await ResetState();
        AddAuth();

        // 1. Setup Environment
        var rt = new RoomType { Name = "Standard", Capacity = 2, DefaultRate = 50 };
        await AddAsync(rt);
        var room = new Room { RoomNumber = "101", RoomTypeId = rt.Id };
        await AddAsync(room);

        var today = DateTime.Today; // Matches metadata context potentially
        var tomorrow = today.AddDays(1);
        var in3Days = today.AddDays(3);

        // --- Iteration A: Imported (Source = PDF) ---
        // A1: Same-Day Checkout (1 night: today -> tomorrow)
        var resA1 = CreateReservation(ReservationSource.PDF, today, tomorrow, rt.Id, room.Id, 50);
        await AddAsync(resA1);
        await PerformCheckout(resA1.Id, today);
        await VerifyScenario("A1 (Imported Same-Day)", resA1.Id, today, 50);

        // A2: Early Checkout (3 nights: today -> in3Days, Checkout today+1)
        var resA2 = CreateReservation(ReservationSource.PDF, today, in3Days, rt.Id, room.Id, 150);
        await AddAsync(resA2);
        await PerformCheckout(resA2.Id, today.AddDays(1));
        await VerifyScenario("A2 (Imported Early)", resA2.Id, today.AddDays(1), 150);

        // A3: Normal Checkout (1 night: today -> tomorrow, Checkout tomorrow)
        var resA3 = CreateReservation(ReservationSource.PDF, today, tomorrow, rt.Id, room.Id, 50);
        await AddAsync(resA3);
        await PerformCheckout(resA3.Id, tomorrow);
        await VerifyScenario("A3 (Imported Normal)", resA3.Id, tomorrow, 50);

        // --- Iteration B: Manual (Source = Manual) ---
        // B1: Same-Day Checkout
        var resB1 = CreateReservation(ReservationSource.Manual, today, tomorrow, rt.Id, room.Id, 50);
        await AddAsync(resB1);
        await PerformCheckout(resB1.Id, today);
        await VerifyScenario("B1 (Manual Same-Day)", resB1.Id, today, 50);

        // B2: Early Checkout
        var resB2 = CreateReservation(ReservationSource.Manual, today, in3Days, rt.Id, room.Id, 150);
        await AddAsync(resB2);
        await PerformCheckout(resB2.Id, today.AddDays(1));
        await VerifyScenario("B2 (Manual Early)", resB2.Id, today.AddDays(1), 150);

        // B3: Normal Checkout
        var resB3 = CreateReservation(ReservationSource.Manual, today, tomorrow, rt.Id, room.Id, 50);
        await AddAsync(resB3);
        await PerformCheckout(resB3.Id, tomorrow);
        await VerifyScenario("B3 (Manual Normal)", resB3.Id, tomorrow, 50);
    }

    private Reservation CreateReservation(ReservationSource source, DateTime start, DateTime end, int roomTypeId, int roomId, decimal total)
    {
        var nights = (int)(end - start).TotalDays;
        if (nights < 1) nights = 1;

        var res = new Reservation
        {
            GuestName = $"Guest {source}",
            CheckInDate = start,
            CheckOutDate = end,
            Status = ReservationStatus.CheckedIn,
            Source = source,
            TotalAmount = total,
            Currency = "USD",
            CurrencyCode = CurrencyCode.USD
        };
        res.Lines.Add(new ReservationLine
        {
            RoomId = roomId,
            RoomTypeId = roomTypeId,
            Nights = nights,
            RatePerNight = total / nights,
            LineTotal = total
        });
        return res;
    }

    private async Task PerformCheckout(int reservationId, DateTime businessDate)
    {
        var command = new CheckOutReservationCommand 
        { 
            ReservationId = reservationId, 
            BusinessDate = DateOnly.FromDateTime(businessDate) 
        };
        var response = await _client.PostAsJsonAsync($"/api/reception/reservations/{reservationId}/check-out", command);
        response.EnsureSuccessStatusCode();
    }

    private async Task VerifyScenario(string scenario, int reservationId, DateTime checkoutDate, decimal expectedTotal)
    {
        // 1. Verify Reservation Status & TotalPrice
        var res = await FindAsync<Reservation>(reservationId);
        Assert.That(res!.Status, Is.EqualTo(ReservationStatus.CheckedOut), $"{scenario}: Status should be CheckedOut");
        Assert.That(res.TotalAmount, Is.EqualTo(expectedTotal), $"{scenario}: TotalAmount must remain intact");
        Assert.That(res.ActualCheckOutDate, Is.EqualTo(checkoutDate), $"{scenario}: ActualCheckOutDate not set correctly");

        // 2. Verify Occupancy (Should be 0 on the night of checkout)
        var occUrl = $"/api/occupancy?from={checkoutDate:yyyy-MM-dd}&to={checkoutDate:yyyy-MM-dd}&mode=actual";
        var occResponse = await _client.GetAsync(occUrl);
        var occ = await occResponse.Content.ReadFromJsonAsync<OccupancySummaryDto>();
        Assert.That(occ!.SoldRoomNights, Is.EqualTo(0), $"{scenario}: Room should be available on checkout date {checkoutDate:yyyy-MM-dd}");

        // 3. Verify Revenue (Should still be counted for original duration)
        var startStr = res.CheckInDate.ToString("yyyy-MM-dd");
        var endStr = res.CheckOutDate.AddDays(-1).ToString("yyyy-MM-dd");
        var revUrl = $"/api/financials/revenue?from={startStr}&to={endStr}&mode=actual&currency=USD";
        var revResponse = await _client.GetAsync(revUrl);
        var rev = await revResponse.Content.ReadFromJsonAsync<RevenueSummaryDto>();
        Assert.That(rev!.TotalRevenue, Is.EqualTo(expectedTotal), $"{scenario}: Revenue yield must be preserved for full stay");
    }
}
