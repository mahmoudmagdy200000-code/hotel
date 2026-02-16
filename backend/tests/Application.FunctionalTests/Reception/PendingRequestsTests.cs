using System.Net;
using System.Net.Http.Json;
using CleanArchitecture.Application.Reception.Queries.GetPendingRequests;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using NUnit.Framework;

namespace CleanArchitecture.Application.FunctionalTests.Reception;

using static Testing;

public class PendingRequestsTests : BaseTestFixture
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
        var response = await _client.GetAsync("/api/reception/pending-requests?from=2026-01-25&to=2026-01-30");
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized));
    }

    [Test]
    public async Task ShouldReturn400WhenRangeInvalid()
    {
        AddAuth();
        var response = await _client.GetAsync("/api/reception/pending-requests?from=2026-01-30&to=2026-01-25");
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
    }

    [Test]
    public async Task PendingRequests_ShouldIncludeOnlyDraftPdfReservations()
    {
        await ResetState();
        AddAuth();

        var today = DateTime.Today;
        var tomorrow = today.AddDays(1);

        // 1. Valid: Draft + PDF
        await AddAsync(new Reservation { BookingNumber = "PDF-1", GuestName = "Guest 1", Status = ReservationStatus.Draft, Source = ReservationSource.PDF, CheckInDate = today, CheckOutDate = tomorrow, Currency = "USD" });
        // 2. Invalid: Confirmed + PDF
        await AddAsync(new Reservation { BookingNumber = "PDF-2", GuestName = "Guest 2", Status = ReservationStatus.Confirmed, Source = ReservationSource.PDF, CheckInDate = today, CheckOutDate = tomorrow, Currency = "USD" });
        // 3. Invalid: Draft + Manual
        await AddAsync(new Reservation { BookingNumber = "MAN-1", GuestName = "Guest 3", Status = ReservationStatus.Draft, Source = ReservationSource.Manual, CheckInDate = today, CheckOutDate = tomorrow, Currency = "USD" });

        var response = await _client.GetAsync($"/api/reception/pending-requests?from={today:yyyy-MM-dd}&to={today.AddDays(7):yyyy-MM-dd}");
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<PendingRequestsDto>();

        Assert.That(result!.Items.Count, Is.EqualTo(1));
        Assert.That(result.Items[0].BookingNumber, Is.EqualTo("PDF-1"));
    }

    [Test]
    public async Task Ordering_ShouldBeDeterministic()
    {
        await ResetState();
        AddAuth();

        var today = DateTime.Today;

        // 1. Parsed (Oldest)
        await AddAsync(new Reservation { BookingNumber = "RES-OLD", Status = ReservationStatus.Draft, Source = ReservationSource.PDF, CheckInDate = today, CheckOutDate = today.AddDays(1), Created = DateTimeOffset.UtcNow.AddMinutes(-10), Notes = "[PARSING_STATUS] Parsed", Currency = "USD" });
        // 2. Parsed (Newest)
        await AddAsync(new Reservation { BookingNumber = "RES-NEW", Status = ReservationStatus.Draft, Source = ReservationSource.PDF, CheckInDate = today, CheckOutDate = today.AddDays(1), Created = DateTimeOffset.UtcNow, Notes = "[PARSING_STATUS] Parsed", Currency = "USD" });
        // 3. Pending
        await AddAsync(new Reservation { BookingNumber = "RES-PEND", Status = ReservationStatus.Draft, Source = ReservationSource.PDF, CheckInDate = today, CheckOutDate = today.AddDays(1), Created = DateTimeOffset.UtcNow.AddMinutes(-5), Notes = "[PARSING_STATUS] Pending", Currency = "USD" });

        var response = await _client.GetAsync($"/api/reception/pending-requests?from={today:yyyy-MM-dd}&to={today.AddDays(7):yyyy-MM-dd}");
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<PendingRequestsDto>();

        // Order: Pending (1), Failed (2), Parsed (3). Within same status, created desc.
        Assert.That(result!.Items[0].BookingNumber, Is.EqualTo("RES-PEND"));
        Assert.That(result.Items[1].BookingNumber, Is.EqualTo("RES-NEW"));
        Assert.That(result.Items[2].BookingNumber, Is.EqualTo("RES-OLD"));
    }

    [Test]
    public async Task Hint_ShouldBeCorrectlyCalculated()
    {
        await ResetState();
        AddAuth();

        // 1. Setup Availability
        // 1 Active room
        var roomType = new RoomType { Name = "Standard", Capacity = 2, DefaultRate = 100, IsActive = true };
        await AddAsync(roomType);
        await AddAsync(new Room { RoomNumber = "101", RoomTypeId = roomType.Id, IsActive = true, Status = RoomStatus.Available });

        var today = DateTime.Today;
        var tomorrow = today.AddDays(1);

        // Supply = 1 room * 1 night = 1 RoomNight

        // 2. Seed Draft that needs hint
        // Available = 1. Pending = 1. Remaining = 0. => "Tight"
        await AddAsync(new Reservation 
        { 
            BookingNumber = "PDF-DRAFT", 
            Status = ReservationStatus.Draft, 
            Source = ReservationSource.PDF, 
            CheckInDate = today, 
            CheckOutDate = tomorrow, 
            Notes = "[PARSING_STATUS] Parsed\n[EXTRACTED] RoomsCount=1",
            Currency = "USD"
        });

        var response = await _client.GetAsync($"/api/reception/pending-requests?from={today:yyyy-MM-dd}&to={tomorrow:yyyy-MM-dd}");
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<PendingRequestsDto>();

        var item = result!.Items[0];
        Assert.That(item.AvailabilityHint, Is.Not.Null);
        Assert.That(item.AvailabilityHint!.SupplyRoomNights, Is.EqualTo(1));
        Assert.That(item.AvailabilityHint.ForecastSoldRoomNights, Is.EqualTo(0));
        Assert.That(item.AvailabilityHint.PendingRoomNights, Is.EqualTo(1));
        Assert.That(item.AvailabilityHint.Bucket, Is.EqualTo("Tight"));
    }

    [Test]
    public async Task Overbook_ShouldTriggerWhenAvailableLessThanPending()
    {
        await ResetState();
        AddAuth();

        // 1 Room active
        var roomType = new RoomType { Name = "Standard", Capacity = 2, DefaultRate = 100, IsActive = true };
        await AddAsync(roomType);
        await AddAsync(new Room { RoomNumber = "101", RoomTypeId = roomType.Id, IsActive = true, Status = RoomStatus.Available });

        var today = DateTime.Today;
        var tomorrow = today.AddDays(1);

        // 2. Request 2 rooms on a 1-room supply
        await AddAsync(new Reservation 
        { 
            BookingNumber = "PDF-OVER", 
            Status = ReservationStatus.Draft, 
            Source = ReservationSource.PDF, 
            CheckInDate = today, 
            CheckOutDate = tomorrow, 
            Notes = "[PARSING_STATUS] Parsed\n[EXTRACTED] RoomsCount=2",
            Currency = "USD"
        });

        var response = await _client.GetAsync($"/api/reception/pending-requests?from={today:yyyy-MM-dd}&to={tomorrow:yyyy-MM-dd}");
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<PendingRequestsDto>();

        Assert.That(result!.Items[0].AvailabilityHint!.Bucket, Is.EqualTo("Overbook"));
    }
}
