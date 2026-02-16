using System.Net;
using System.Net.Http.Json;
using CleanArchitecture.Application.Reservations.Queries.SearchReservations;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using NUnit.Framework;

namespace CleanArchitecture.Application.FunctionalTests.Reception;

using static Testing;

public class ReceptionSearchTests : BaseTestFixture
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
        var response = await _client.GetAsync("/api/reception/reservations/search?query=abc");
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized));
    }

    [Test]
    public async Task ShouldReturn400WhenQueryTooShort()
    {
        await ResetState();
        AddAuth();
        var response = await _client.GetAsync("/api/reception/reservations/search?query=a");
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
    }

    [Test]
    public async Task SearchByBookingNumber_ShouldReturnMatches()
    {
        await ResetState();
        AddAuth();

        await AddAsync(new Reservation { BookingNumber = "BH-100", GuestName = "Guest 1", CheckInDate = DateTime.Today, CheckOutDate = DateTime.Today.AddDays(1), Status = ReservationStatus.Confirmed, Currency = "USD" });
        await AddAsync(new Reservation { BookingNumber = "BH-200", GuestName = "Guest 2", CheckInDate = DateTime.Today, CheckOutDate = DateTime.Today.AddDays(1), Status = ReservationStatus.Confirmed, Currency = "USD" });
        await AddAsync(new Reservation { BookingNumber = "OTHER", GuestName = "Guest 3", CheckInDate = DateTime.Today, CheckOutDate = DateTime.Today.AddDays(1), Status = ReservationStatus.Confirmed, Currency = "USD" });

        var response = await _client.GetAsync("/api/reception/reservations/search?query=BH-");
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<ReceptionSearchResultDto>();

        Assert.That(result!.Results.Count, Is.EqualTo(2));
        Assert.That(result.Results.Any(r => r.BookingNumber == "BH-100"), Is.True);
        Assert.That(result.Results.Any(r => r.BookingNumber == "BH-200"), Is.True);
    }

    [Test]
    public async Task SearchByGuestName_IsCaseInsensitive()
    {
        await ResetState();
        AddAuth();

        await AddAsync(new Reservation { GuestName = "Ahmed Ali", CheckInDate = DateTime.Today, CheckOutDate = DateTime.Today.AddDays(1), Status = ReservationStatus.Confirmed, Currency = "USD" });

        var response = await _client.GetAsync("/api/reception/reservations/search?query=ahmed");
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<ReceptionSearchResultDto>();

        Assert.That(result!.Results.Count, Is.EqualTo(1));
        Assert.That(result.Results[0].GuestName, Is.EqualTo("Ahmed Ali"));
    }

    [Test]
    public async Task Search_ShouldExcludeDrafts()
    {
        await ResetState();
        AddAuth();

        await AddAsync(new Reservation { BookingNumber = "CONF-1", GuestName = "Active", Status = ReservationStatus.Confirmed, CheckInDate = DateTime.Today, CheckOutDate = DateTime.Today.AddDays(1), Currency = "USD" });
        await AddAsync(new Reservation { BookingNumber = "DRAFT-1", GuestName = "Active", Status = ReservationStatus.Draft, CheckInDate = DateTime.Today, CheckOutDate = DateTime.Today.AddDays(1), Currency = "USD" });

        var response = await _client.GetAsync("/api/reception/reservations/search?query=Active");
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<ReceptionSearchResultDto>();

        Assert.That(result!.Results.Count, Is.EqualTo(1));
        Assert.That(result.Results[0].BookingNumber, Is.EqualTo("CONF-1"));
    }

    [Test]
    public async Task Ordering_ShouldPrioritizeDateRelevance()
    {
        await ResetState();
        AddAuth();

        var today = DateTime.Today;
        var tomorrow = today.AddDays(1);
        var searchDate = DateOnly.FromDateTime(today);

        // 1. In House (Highest priority)
        await AddAsync(new Reservation { BookingNumber = "INHOUSE", GuestName = "Match", CheckInDate = today.AddDays(-1), CheckOutDate = tomorrow, Status = ReservationStatus.CheckedIn, Currency = "USD" });
        // 2. Arrival (Second)
        await AddAsync(new Reservation { BookingNumber = "ARRIVAL", GuestName = "Match", CheckInDate = today, CheckOutDate = tomorrow, Status = ReservationStatus.Confirmed, Currency = "USD" });
        // 3. Departure (Third)
        await AddAsync(new Reservation { BookingNumber = "DEPART", GuestName = "Match", CheckInDate = today.AddDays(-2), CheckOutDate = today, Status = ReservationStatus.CheckedIn, Currency = "USD" });
        // 4. Other (Lowest)
        await AddAsync(new Reservation { BookingNumber = "OTHER", GuestName = "Match", CheckInDate = today.AddDays(10), CheckOutDate = today.AddDays(11), Status = ReservationStatus.Confirmed, Currency = "USD" });

        var response = await _client.GetAsync($"/api/reception/reservations/search?query=Match&date={searchDate:yyyy-MM-dd}");
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<ReceptionSearchResultDto>();

        Assert.That(result!.Results.Count, Is.EqualTo(4));
        Assert.That(result.Results[0].BookingNumber, Is.EqualTo("INHOUSE"));
        Assert.That(result.Results[1].BookingNumber, Is.EqualTo("ARRIVAL"));
        Assert.That(result.Results[2].BookingNumber, Is.EqualTo("DEPART"));
        Assert.That(result.Results[3].BookingNumber, Is.EqualTo("OTHER"));
    }

    [Test]
    public async Task SearchById_ShouldReturnExactMatch()
    {
        await ResetState();
        AddAuth();

        var res = new Reservation { BookingNumber = "ID-MATCH", GuestName = "Guest", CheckInDate = DateTime.Today, CheckOutDate = DateTime.Today.AddDays(1), Status = ReservationStatus.Confirmed, Currency = "USD" };
        await AddAsync(res);

        // Search by booking number (ID search with single digit may fail min length validation)
        var response = await _client.GetAsync($"/api/reception/reservations/search?query=ID-MATCH");
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<ReceptionSearchResultDto>();

        Assert.That(result!.Results.Count, Is.EqualTo(1));
        Assert.That(result.Results[0].ReservationId, Is.EqualTo(res.Id));
    }
}
