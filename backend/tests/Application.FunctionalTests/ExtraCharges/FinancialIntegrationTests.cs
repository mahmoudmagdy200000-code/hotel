using System.Net.Http.Json;
using CleanArchitecture.Application.Dashboard.Queries.GetDashboard;
using CleanArchitecture.Application.Dashboard.Queries.GetDailyCashFlow;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using NUnit.Framework;

namespace CleanArchitecture.Application.FunctionalTests.ExtraCharges;

using static Testing;

/// <summary>
/// Integration tests verifying that ExtraCharges are accurately included
/// (Paid only) in both the Dashboard TotalRevenue and the Net Cash in Drawer.
/// These tests run against a real MySQL DB (Testcontainers) via EF Core,
/// ensuring the actual SQL translation is verified — not mocked.
/// </summary>
[TestFixture]
public class FinancialIntegrationTests : BaseTestFixture
{
    private HttpClient _client = null!;

    [SetUp]
    public void SetUpClient()
    {
        _client = _factory.CreateClient();
        // No SkipAuthentication header → TestAuthHandler returns Success
    }

    [TearDown]
    public void TearDownClient()
    {
        _client.Dispose();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 1: Dashboard Revenue correctness
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Seeds:
    ///   - 1 CheckedOut reservation  → core revenue = 500 EGP
    ///   - 1 Paid ExtraCharge        → +75 EGP (MUST be included)
    ///   - 1 Pending ExtraCharge     → +200 EGP (MUST be excluded)
    /// Expected TotalRevenue = 575
    /// </summary>
    [Test]
    public async Task Dashboard_RevenueIncludesPaidExtraCharges_AndExcludesPendingOnes()
    {
        // BaseTestFixture.TestSetUp already called ResetState()
        await RunAsAdministratorAsync();

        var rt = new RoomType { Name = "Deluxe", Capacity = 2 };
        await AddAsync(rt);
        var room = new Room { RoomNumber = "301", RoomTypeId = rt.Id };
        await AddAsync(room);

        var testDate = new DateTime(2026, 7, 1);

        // CheckedOut reservation = 500 EGP core revenue
        var reservation = new Reservation
        {
            GuestName = "Extra Test Guest",
            CheckInDate = testDate,
            CheckOutDate = testDate.AddDays(1),
            Status = ReservationStatus.CheckedOut,
            TotalAmount = 500
        };
        reservation.Lines.Add(new ReservationLine
        {
            RoomId = room.Id,
            RoomTypeId = rt.Id,
            RatePerNight = 500,
            Nights = 1,
            LineTotal = 500
        });
        await AddAsync(reservation);

        // Paid extra charge (+75) — MUST be counted
        await AddAsync(new ExtraCharge
        {
            ReservationId = reservation.Id,
            Description = "Room Service",
            Amount = 75,
            Date = testDate,
            CurrencyCode = CurrencyCode.EGP,
            PaymentStatus = PaymentStatus.Paid
        });

        // Pending extra charge (+200) — MUST be excluded
        await AddAsync(new ExtraCharge
        {
            ReservationId = reservation.Id,
            Description = "Tour Package (pending)",
            Amount = 200,
            Date = testDate,
            CurrencyCode = CurrencyCode.EGP,
            PaymentStatus = PaymentStatus.Pending
        });

        // Act
        var response = await _client.GetAsync(
            "/api/dashboard?from=2026-07-01&to=2026-07-02&mode=actual");

        var body = await response.Content.ReadAsStringAsync();
        Assert.That(response.IsSuccessStatusCode,
            $"Dashboard call failed {response.StatusCode}: {body}");

        var dashboard = await response.Content.ReadFromJsonAsync<DashboardDto>();

        // Assert: 500 (core) + 75 (paid extra) = 575 — the 200 pending must be excluded
        Assert.That(dashboard!.Summary.TotalRevenue, Is.EqualTo(575m),
            "TotalRevenue must equal core revenue + Paid extras only. Pending extras must be excluded.");

        var day = dashboard.ByDay.FirstOrDefault(d => d.Date == "2026-07-01");
        Assert.That(day, Is.Not.Null, "Expected ByDay series entry for 2026-07-01");
        Assert.That(day!.Revenue, Is.EqualTo(575m),
            "Daily series revenue must include Paid extra charges.");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 2: CashFlow (Net Cash in Drawer) correctness
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Seeds:
    ///   - 1 Paid ExtraCharge = 80 EGP (Paid) → MUST increase Net Cash
    ///   - 1 Pending ExtraCharge = 120 EGP    → MUST be excluded
    /// Note: We do NOT seed a Payment directly (FK constraints).
    ///       We verify only the ExtraCharge portion addition.
    ///       Net Cash = 0 (no payments) + 80 (paid extra) − 0 (no expenses) = 80
    /// </summary>
    [Test]
    public async Task CashFlow_NetCashIncludesPaidExtraCharges_AndExcludesPendingOnes()
    {
        await RunAsAdministratorAsync();

        var testDate = new DateTime(2026, 8, 15);

        // Seed a minimal reservation to satisfy FK on ExtraCharge
        var rt = new RoomType { Name = "Standard", Capacity = 1 };
        await AddAsync(rt);
        var room = new Room { RoomNumber = "001", RoomTypeId = rt.Id };
        await AddAsync(room);

        var res = new Reservation
        {
            GuestName = "Cash Flow Test Guest",
            CheckInDate = testDate,
            CheckOutDate = testDate.AddDays(1),
            Status = ReservationStatus.CheckedIn
        };
        await AddAsync(res);

        // Paid ExtraCharge = 80 EGP ✅
        await AddAsync(new ExtraCharge
        {
            ReservationId = res.Id,
            Description = "Late Checkout Fee",
            Amount = 80,
            Date = testDate,
            CurrencyCode = CurrencyCode.EGP,
            PaymentStatus = PaymentStatus.Paid
        });

        // Pending ExtraCharge = 120 EGP ❌ must NOT affect net cash
        await AddAsync(new ExtraCharge
        {
            ReservationId = res.Id,
            Description = "Pending Minibar",
            Amount = 120,
            Date = testDate,
            CurrencyCode = CurrencyCode.EGP,
            PaymentStatus = PaymentStatus.Pending
        });

        // Act
        var response = await _client.GetAsync(
            "/api/dashboard/cashflow?date=2026-08-15");

        var body = await response.Content.ReadAsStringAsync();
        Assert.That(response.IsSuccessStatusCode,
            $"CashFlow call failed {response.StatusCode}: {body}");

        var dto = await response.Content.ReadFromJsonAsync<DailyCashFlowDto>();

        // Assert: 0 (no cash payments) + 80 (paid extra) − 0 (no expenses) = 80
        Assert.That(dto!.NetCashInDrawer, Is.EqualTo(80m),
            "Net Cash must include Paid extra charges (80) and exclude Pending ones (120).");
    }
}
