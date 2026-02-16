using System.Net;
using System.Net.Http.Json;
using CleanArchitecture.Application.Reservations.Commands.ReceptionActions;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using NUnit.Framework;

namespace CleanArchitecture.Application.FunctionalTests.Reception;

using static Testing;

public class ReceptionActionsTests : BaseTestFixture
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
        var response = await _client.PostAsJsonAsync("/api/reception/reservations/1/check-in", new CheckInTestRequest(DateOnly.FromDateTime(DateTime.Today)));
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized));
    }

    [Test]
    public async Task CheckIn_ShouldUpdateStatus_WhenDateMatchesAndConfirmed()
    {
        await ResetState();
        AddAuth();

        var checkInDate = new DateTime(2026, 1, 25);
        var res = new Reservation
        {
            GuestName = "Test Guest",
            CheckInDate = checkInDate,
            CheckOutDate = checkInDate.AddDays(2),
            Status = ReservationStatus.Confirmed,
            Currency = "USD"
        };
        await AddAsync(res);

        var businessDate = DateOnly.FromDateTime(checkInDate);
        var response = await _client.PostAsJsonAsync($"/api/reception/reservations/{res.Id}/check-in", new CheckInTestRequest(businessDate));
        
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<ReservationStatusChangedDto>();

        Assert.That(result!.NewStatus, Is.EqualTo(ReservationStatus.CheckedIn.ToString()));
        Assert.That(result.OldStatus, Is.EqualTo(ReservationStatus.Confirmed.ToString()));
        Assert.That(result.BusinessDate, Is.EqualTo(businessDate.ToString("yyyy-MM-dd")));

        var updated = await FindAsync<Reservation>(res.Id);
        Assert.That(updated!.Status, Is.EqualTo(ReservationStatus.CheckedIn));
        Assert.That(updated.CheckedInAt, Is.Not.Null);
    }

    [Test]
    public async Task CheckIn_ShouldReturn400_WhenDateDoesNotMatch()
    {
        await ResetState();
        AddAuth();

        var checkInDate = new DateTime(2026, 1, 25);
        var res = new Reservation
        {
            GuestName = "Test Guest",
            CheckInDate = checkInDate,
            CheckOutDate = checkInDate.AddDays(2),
            Status = ReservationStatus.Confirmed,
            Currency = "USD"
        };
        await AddAsync(res);

        var wrongDate = DateOnly.FromDateTime(checkInDate.AddDays(1));
        var response = await _client.PostAsJsonAsync($"/api/reception/reservations/{res.Id}/check-in", new CheckInTestRequest(wrongDate));
        
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
    }

    [Test]
    public async Task CheckOut_ShouldUpdateStatus_WhenDateMatchesAndCheckedIn()
    {
        await ResetState();
        AddAuth();

        var checkInDate = new DateTime(2026, 1, 25);
        var checkOutDate = checkInDate.AddDays(2);
        var res = new Reservation
        {
            GuestName = "Test Guest",
            CheckInDate = checkInDate,
            CheckOutDate = checkOutDate,
            Status = ReservationStatus.CheckedIn,
            Currency = "USD"
        };
        await AddAsync(res);

        var businessDate = DateOnly.FromDateTime(checkOutDate);
        var response = await _client.PostAsJsonAsync($"/api/reception/reservations/{res.Id}/check-out", new CheckOutTestRequest(businessDate));
        
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<ReservationStatusChangedDto>();

        Assert.That(result!.NewStatus, Is.EqualTo(ReservationStatus.CheckedOut.ToString()));
        Assert.That(result.OldStatus, Is.EqualTo(ReservationStatus.CheckedIn.ToString()));

        var updated = await FindAsync<Reservation>(res.Id);
        Assert.That(updated!.Status, Is.EqualTo(ReservationStatus.CheckedOut));
        Assert.That(updated.CheckedOutAt, Is.Not.Null);
    }

    [Test]
    public async Task InvalidTransition_ShouldReturn409()
    {
        await ResetState();
        AddAuth();

        // Try to cancel a CheckedIn reservation
        var res = new Reservation
        {
            GuestName = "In House",
            CheckInDate = DateTime.Today,
            CheckOutDate = DateTime.Today.AddDays(1),
            Status = ReservationStatus.CheckedIn,
            Currency = "USD"
        };
        await AddAsync(res);

        var response = await _client.PostAsJsonAsync($"/api/reception/reservations/{res.Id}/cancel", new CancelTestRequest("Emergency"));
        
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Conflict));
    }

    [Test]
    public async Task CancelAndNoShow_AllowedOnlyFromConfirmed()
    {
        await ResetState();
        AddAuth();

        // 1. Confirmed -> Cancel (Success)
        var resC = new Reservation { GuestName = "C", CheckInDate = DateTime.Today, CheckOutDate = DateTime.Today.AddDays(1), Status = ReservationStatus.Confirmed, Currency = "USD" };
        await AddAsync(resC);
        var responseC = await _client.PostAsJsonAsync($"/api/reception/reservations/{resC.Id}/cancel", new CancelTestRequest("User requested"));
        Assert.That(responseC.StatusCode, Is.EqualTo(HttpStatusCode.OK));

        // 2. Confirmed -> NoShow (Success)
        var resN = new Reservation { GuestName = "N", CheckInDate = DateTime.Today, CheckOutDate = DateTime.Today.AddDays(1), Status = ReservationStatus.Confirmed, Currency = "USD" };
        await AddAsync(resN);
        var responseN = await _client.PostAsJsonAsync($"/api/reception/reservations/{resN.Id}/no-show", new NoShowTestRequest("Didn't arrive"));
        Assert.That(responseN.StatusCode, Is.EqualTo(HttpStatusCode.OK));

        // 3. Draft -> Cancel (Allowed - Draft reservations from PDF uploads can be discarded)
        var resD = new Reservation { GuestName = "D", CheckInDate = DateTime.Today, CheckOutDate = DateTime.Today.AddDays(1), Status = ReservationStatus.Draft, Currency = "USD" };
        await AddAsync(resD);
        var responseD = await _client.PostAsJsonAsync($"/api/reception/reservations/{resD.Id}/cancel", new CancelTestRequest("Draft cleanup"));
        Assert.That(responseD.StatusCode, Is.EqualTo(HttpStatusCode.OK));
    }

    [Test]
    public async Task Idempotency_ShouldReturnSuccess_WhenReapplyingSameAction()
    {
        await ResetState();
        AddAuth();

        var res = new Reservation
        {
            GuestName = "Idempotent Guest",
            CheckInDate = new DateTime(2026, 1, 25),
            CheckOutDate = new DateTime(2026, 1, 27),
            Status = ReservationStatus.CheckedIn,
            CheckedInAt = DateTime.UtcNow.AddMinutes(-10),
            Currency = "USD"
        };
        await AddAsync(res);

        var businessDate = new DateOnly(2026, 1, 25);
        var response = await _client.PostAsJsonAsync($"/api/reception/reservations/{res.Id}/check-in", new CheckInTestRequest(businessDate));
        
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<ReservationStatusChangedDto>();

        Assert.That(result!.NewStatus, Is.EqualTo(ReservationStatus.CheckedIn.ToString()));
        Assert.That(result.OldStatus, Is.EqualTo(ReservationStatus.CheckedIn.ToString()));
    }
}

public record CheckInTestRequest(DateOnly BusinessDate);
public record CheckOutTestRequest(DateOnly BusinessDate);
public record CancelTestRequest(string? Reason);
public record NoShowTestRequest(string? Reason);
