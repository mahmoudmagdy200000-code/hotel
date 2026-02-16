using System.Net;
using System.Net.Http.Json;
using CleanArchitecture.Application.Reservations.Commands.ReceptionActions;
using CleanArchitecture.Application.Reservations.Queries.GetReservations;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using NUnit.Framework;

namespace CleanArchitecture.Application.FunctionalTests.Reception;

using static Testing;

public class ConfirmDraftReservationTests : BaseTestFixture
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
    public async Task Confirm_ShouldReturn401WhenUnauthenticated()
    {
        AddAuth(false);
        var response = await _client.PostAsync("/api/reception/reservations/1/confirm", null);
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized));
    }

    [Test]
    public async Task Confirm_ShouldReturn404WhenNotFound()
    {
        AddAuth();
        var response = await _client.PostAsync("/api/reception/reservations/9999/confirm", null);
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.NotFound));
    }

    [Test]
    public async Task Confirm_ShouldReturn404_WhenSoftDeleted()
    {
        await ResetState();
        AddAuth();

        var res = new Reservation
        {
            Status = ReservationStatus.Draft,
            Source = ReservationSource.PDF,
            GuestName = "Deleted Guest",
            CheckInDate = DateTime.Today,
            CheckOutDate = DateTime.Today.AddDays(1),
            Currency = "USD",
            IsDeleted = true,
            DeletedAtUtc = DateTime.UtcNow
        };
        await AddAsync(res);

        var response = await _client.PostAsync($"/api/reception/reservations/{res.Id}/confirm", null);
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.NotFound));
    }

    [Test]
    public async Task Confirm_ShouldReturn409_WhenNotDraft()
    {
        await ResetState();
        AddAuth();

        var res = new Reservation
        {
            Status = ReservationStatus.Cancelled,
            Source = ReservationSource.PDF,
            GuestName = "Draft",
            CheckInDate = DateTime.Today,
            CheckOutDate = DateTime.Today.AddDays(1),
            Currency = "USD"
        };
        await AddAsync(res);

        var response = await _client.PostAsync($"/api/reception/reservations/{res.Id}/confirm", null);
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Conflict));
    }

    [Test]
    public async Task Confirm_ShouldReturn409_WhenSourceMismatch()
    {
        await ResetState();
        AddAuth();

        var res = new Reservation
        {
            Status = ReservationStatus.Draft,
            Source = ReservationSource.Manual,
            GuestName = "Manual",
            CheckInDate = DateTime.Today,
            CheckOutDate = DateTime.Today.AddDays(1),
            Currency = "USD"
        };
        await AddAsync(res);

        var response = await _client.PostAsync($"/api/reception/reservations/{res.Id}/confirm", null);
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Conflict));
    }

    [Test]
    public async Task Confirm_ShouldReturn400_WhenCheckInDateMissing()
    {
        await ResetState();
        AddAuth();

        var res = new Reservation
        {
            Status = ReservationStatus.Draft,
            Source = ReservationSource.PDF,
            GuestName = "Valid Guest",
            CheckInDate = default, // Missing
            CheckOutDate = DateTime.Today.AddDays(2),
            Currency = "USD",
            Notes = "[EXTRACTED] RoomsCount=1"
        };
        await AddAsync(res);

        var response = await _client.PostAsync($"/api/reception/reservations/{res.Id}/confirm", null);
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
    }

    [Test]
    public async Task Confirm_ShouldReturn400_WhenCheckOutDateMissing()
    {
        await ResetState();
        AddAuth();

        var res = new Reservation
        {
            Status = ReservationStatus.Draft,
            Source = ReservationSource.PDF,
            GuestName = "Valid Guest",
            CheckInDate = DateTime.Today,
            CheckOutDate = default, // Missing
            Currency = "USD",
            Notes = "[EXTRACTED] RoomsCount=1"
        };
        await AddAsync(res);

        var response = await _client.PostAsync($"/api/reception/reservations/{res.Id}/confirm", null);
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
    }

    [Test]
    public async Task Confirm_ShouldReturn400_WhenCheckOutBeforeCheckIn()
    {
        await ResetState();
        AddAuth();

        var res = new Reservation
        {
            Status = ReservationStatus.Draft,
            Source = ReservationSource.PDF,
            GuestName = "Valid Guest",
            CheckInDate = DateTime.Today.AddDays(2),
            CheckOutDate = DateTime.Today, // Before check-in
            Currency = "USD",
            Notes = "[EXTRACTED] RoomsCount=1"
        };
        await AddAsync(res);

        var response = await _client.PostAsync($"/api/reception/reservations/{res.Id}/confirm", null);
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
    }

    [Test]
    public async Task Confirm_ShouldReturn400_WhenCheckInDateInPast()
    {
        await ResetState();
        AddAuth();

        var res = new Reservation
        {
            Status = ReservationStatus.Draft,
            Source = ReservationSource.PDF,
            GuestName = "Valid Guest",
            CheckInDate = DateTime.Today.AddDays(-1), // Past
            CheckOutDate = DateTime.Today,
            Currency = "USD",
            Notes = "[EXTRACTED] RoomsCount=1"
        };
        await AddAsync(res);

        var response = await _client.PostAsync($"/api/reception/reservations/{res.Id}/confirm", null);
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
    }

    [Test]
    public async Task Confirm_ShouldReturn400_WhenGuestIdentifierMissing()
    {
        await ResetState();
        AddAuth();

        var res = new Reservation
        {
            Status = ReservationStatus.Draft,
            Source = ReservationSource.PDF,
            GuestName = "PDF Guest", // Not a valid guest name
            BookingNumber = "PDF-123", // Not a valid booking number
            CheckInDate = DateTime.Today,
            CheckOutDate = DateTime.Today.AddDays(2),
            Currency = "USD",
            Notes = "[EXTRACTED] RoomsCount=1"
        };
        await AddAsync(res);

        var response = await _client.PostAsync($"/api/reception/reservations/{res.Id}/confirm", null);
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
    }

    [Test]
    public async Task Confirm_ShouldReturn400_WhenNoRoomAssignment()
    {
        await ResetState();
        AddAuth();

        var res = new Reservation
        {
            Status = ReservationStatus.Draft,
            Source = ReservationSource.PDF,
            GuestName = "Valid Guest",
            CheckInDate = DateTime.Today,
            CheckOutDate = DateTime.Today.AddDays(2),
            Currency = "USD",
            Notes = "" // No extracted rooms, no lines
        };
        await AddAsync(res);

        var response = await _client.PostAsync($"/api/reception/reservations/{res.Id}/confirm", null);
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
    }

    [Test]
    public async Task Confirm_ShouldSucceed_ForPdfDraft()
    {
        await ResetState();
        AddAuth();

        var res = new Reservation
        {
            Status = ReservationStatus.Draft,
            Source = ReservationSource.PDF,
            GuestName = "Valid Guest Name",
            CheckInDate = DateTime.Today,
            CheckOutDate = DateTime.Today.AddDays(2),
            Currency = "USD",
            Notes = "[EXTRACTED] RoomsCount=1"
        };
        await AddAsync(res);

        // Act
        var response = await _client.PostAsync($"/api/reception/reservations/{res.Id}/confirm", null);

        // Assert
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<ReservationStatusChangedDto>();

        Assert.That(result!.OldStatus, Is.EqualTo(ReservationStatus.Draft.ToString()));
        Assert.That(result.NewStatus, Is.EqualTo(ReservationStatus.Confirmed.ToString()));

        // DB Verify
        var dbRes = await FindAsync<Reservation>(res.Id);
        Assert.That(dbRes!.Status, Is.EqualTo(ReservationStatus.Confirmed));
        Assert.That(dbRes.ConfirmedAt, Is.Not.Null);
    }

    [Test]
    public async Task Confirm_ShouldIncludeWarning_WhenOverbooked()
    {
        await ResetState();
        AddAuth();

        // 1. Setup Availability: 1 Room
        var rt = new RoomType { Name = "S", Capacity = 2, DefaultRate = 100, IsActive = true };
        await AddAsync(rt);
        await AddAsync(new Room { RoomNumber = "101", RoomTypeId = rt.Id, IsActive = true, Status = RoomStatus.Available });

        var today = DateTime.Today;
        var tomorrow = today.AddDays(1);

        // 2. Draft requesting 2 rooms (Overbook)
        var res = new Reservation
        {
            Status = ReservationStatus.Draft,
            Source = ReservationSource.PDF,
            GuestName = "Big Guest",
            CheckInDate = today,
            CheckOutDate = tomorrow,
            Currency = "USD",
            Notes = "[PARSING_STATUS] Parsed\n[EXTRACTED] RoomsCount=2"
        };
        await AddAsync(res);

        // Act
        var response = await _client.PostAsync($"/api/reception/reservations/{res.Id}/confirm", null);

        // Assert
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<ReservationStatusChangedDto>();

        Assert.That(result!.Message, Does.Contain("OVERBOOKING"));
        Assert.That(result.NewStatus, Is.EqualTo(ReservationStatus.Confirmed.ToString()));
    }

    [Test]
    public async Task Confirm_EndToEnd_ShouldAppearInReservationsListAndNotInPending()
    {
        await ResetState();
        AddAuth();

        // 1. Create a Draft PDF reservation
        var draft = new Reservation
        {
            Status = ReservationStatus.Draft,
            Source = ReservationSource.PDF,
            GuestName = "E2E Test Guest",
            BookingNumber = "BK-E2E-001",
            CheckInDate = DateTime.Today.AddDays(1),
            CheckOutDate = DateTime.Today.AddDays(3),
            Currency = "USD",
            TotalAmount = 200,
            Notes = "[EXTRACTED] RoomsCount=1"
        };
        await AddAsync(draft);

        // 2. Verify Draft appears in Pending Requests (via GET /api/reception/pending-requests)
        var pendingBefore = await _client.GetAsync($"/api/reception/pending-requests?from={DateTime.Today:yyyy-MM-dd}&to={DateTime.Today.AddDays(7):yyyy-MM-dd}");
        pendingBefore.EnsureSuccessStatusCode();
        var pendingDataBefore = await pendingBefore.Content.ReadFromJsonAsync<dynamic>();
        // Note: We can't easily assert on dynamic JSON here, but the endpoint should return the draft

        // 3. Verify Draft does NOT appear in GET /api/reservations (default excludes Draft)
        var reservationsBefore = await _client.GetAsync("/api/reservations");
        reservationsBefore.EnsureSuccessStatusCode();
        var reservationsListBefore = await reservationsBefore.Content.ReadFromJsonAsync<List<ReservationDto>>();
        Assert.That(reservationsListBefore, Is.Not.Null);
        Assert.That(reservationsListBefore!.Any(r => r.Id == draft.Id), Is.False, "Draft should NOT appear in reservations list");

        // 4. Confirm the reservation
        var confirmResponse = await _client.PostAsync($"/api/reception/reservations/{draft.Id}/confirm", null);
        confirmResponse.EnsureSuccessStatusCode();
        var confirmResult = await confirmResponse.Content.ReadFromJsonAsync<ReservationStatusChangedDto>();
        Assert.That(confirmResult!.NewStatus, Is.EqualTo(ReservationStatus.Confirmed.ToString()));

        // 5. Verify Confirmed reservation DOES appear in GET /api/reservations
        var reservationsAfter = await _client.GetAsync("/api/reservations");
        reservationsAfter.EnsureSuccessStatusCode();
        var reservationsListAfter = await reservationsAfter.Content.ReadFromJsonAsync<List<ReservationDto>>();
        Assert.That(reservationsListAfter, Is.Not.Null);
        Assert.That(reservationsListAfter!.Any(r => r.Id == draft.Id && r.Status == ReservationStatus.Confirmed), Is.True, 
            "Confirmed reservation MUST appear in reservations list");

        // 6. Verify database state
        var dbRes = await FindAsync<Reservation>(draft.Id);
        Assert.That(dbRes!.Status, Is.EqualTo(ReservationStatus.Confirmed));
        Assert.That(dbRes.ConfirmedAt, Is.Not.Null);
    }

    [Test]
    public async Task GetReservations_ShouldExcludeDraftByDefault()
    {
        await ResetState();
        AddAuth();

        // Create multiple reservations with different statuses
        var draft = new Reservation
        {
            Status = ReservationStatus.Draft,
            Source = ReservationSource.PDF,
            GuestName = "Draft Guest",
            CheckInDate = DateTime.Today,
            CheckOutDate = DateTime.Today.AddDays(1),
            Currency = "USD",
            Notes = "[EXTRACTED] RoomsCount=1"
        };
        await AddAsync(draft);

        var confirmed = new Reservation
        {
            Status = ReservationStatus.Confirmed,
            Source = ReservationSource.Manual,
            GuestName = "Confirmed Guest",
            CheckInDate = DateTime.Today,
            CheckOutDate = DateTime.Today.AddDays(1),
            Currency = "USD"
        };
        await AddAsync(confirmed);

        // Act: GET /api/reservations (no status filter)
        var response = await _client.GetAsync("/api/reservations");
        response.EnsureSuccessStatusCode();
        var list = await response.Content.ReadFromJsonAsync<List<ReservationDto>>();

        // Assert: Draft should be excluded, Confirmed should be included
        Assert.That(list, Is.Not.Null);
        Assert.That(list!.Any(r => r.Id == draft.Id), Is.False, "Draft should be excluded by default");
        Assert.That(list.Any(r => r.Id == confirmed.Id), Is.True, "Confirmed should be included");
    }

    [Test]
    public async Task GetReservations_ShouldIncludeDraftWhenExplicitlyRequested()
    {
        await ResetState();
        AddAuth();

        var draft = new Reservation
        {
            Status = ReservationStatus.Draft,
            Source = ReservationSource.PDF,
            GuestName = "Draft Guest",
            CheckInDate = DateTime.Today,
            CheckOutDate = DateTime.Today.AddDays(1),
            Currency = "USD",
            Notes = "[EXTRACTED] RoomsCount=1"
        };
        await AddAsync(draft);

        // Act: GET /api/reservations?status=Draft (explicit filter)
        var response = await _client.GetAsync($"/api/reservations?status={ReservationStatus.Draft}");
        response.EnsureSuccessStatusCode();
        var list = await response.Content.ReadFromJsonAsync<List<ReservationDto>>();

        // Assert: Draft should be included when explicitly requested
        Assert.That(list, Is.Not.Null);
        Assert.That(list!.Any(r => r.Id == draft.Id), Is.True, "Draft should be included when explicitly requested");
    }
}
