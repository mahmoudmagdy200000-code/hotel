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
    // ─────────────────────────────────────────────────────────────────────────
    // TEST 3: Full Net Cash formula — Payments + ExtraCharges - Expenses
    //         AND PaymentMethod filtering (Cash only)
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Seeds for business date 2026-09-10:
    ///   - 1 Cash Payment     = 500 EGP  ✅ counted
    ///   - 1 Paid Cash ExtraCharge  = 100 EGP  ✅ counted
    ///   - 1 Paid Card ExtraCharge  = 200 EGP  ❌ excluded (PaymentMethod != Cash)
    ///   - 1 Cash Expense           =  50 EGP  ➖ deducted
    /// Expected: 500 + 100 - 50 = 550
    /// </summary>
    [Test]
    public async Task ShouldIncludeExtraChargesInCashFlow_CashOnly_ExcludesCardPayments()
    {
        await RunAsAdministratorAsync();

        var testDate = new DateOnly(2026, 9, 10);
        var testDateTime = testDate.ToDateTime(TimeOnly.MinValue);

        // ── Seed reservation (FK required) ──────────────────────────────────
        var rt = new RoomType { Name = "Suite", Capacity = 2 };
        await AddAsync(rt);
        var room = new Room { RoomNumber = "S01", RoomTypeId = rt.Id };
        await AddAsync(room);
        var res = new Reservation
        {
            GuestName = "Net Cash Test Guest",
            CheckInDate = testDateTime,
            CheckOutDate = testDateTime.AddDays(1),
            Status = ReservationStatus.CheckedIn
        };
        await AddAsync(res);

        // ── Seed: Cash Payment = 500 EGP ─────────────────────────────────────
        // Created is set by EF via the interceptor — we seed via AddAsync so the
        // Created timestamp will be "now" (test DB time). For stable filtering,
        // CashFlowService uses businessDate param, not "today" when called with a date.
        await AddAsync(new Payment
        {
            ReservationId = res.Id,
            Amount = 500m,
            CurrencyCode = CurrencyCode.EGP,
            PaymentMethod = PaymentMethod.Cash
        });

        // ── Seed: Paid CASH ExtraCharge = 100 EGP ✅ ─────────────────────────
        await AddAsync(new ExtraCharge
        {
            ReservationId = res.Id,
            Description = "Cash Room Service",
            Amount = 100m,
            Date = testDateTime,
            CurrencyCode = CurrencyCode.EGP,
            PaymentStatus = PaymentStatus.Paid,
            PaymentMethod = PaymentMethod.Cash
        });

        // ── Seed: Paid CARD ExtraCharge = 200 EGP ❌ should NOT enter drawer ─
        await AddAsync(new ExtraCharge
        {
            ReservationId = res.Id,
            Description = "Card Tour",
            Amount = 200m,
            Date = testDateTime,
            CurrencyCode = CurrencyCode.EGP,
            PaymentStatus = PaymentStatus.Paid,
            PaymentMethod = PaymentMethod.Visa
        });

        // ── Seed: Cash Expense = 50 EGP ➖ ────────────────────────────────────
        await AddAsync(new Expense
        {
            BusinessDate = testDate,
            Category = ExpenseCategory.Other,
            Description = "Supplies",
            Amount = 50m,
            CurrencyCode = CurrencyCode.EGP,
            PaymentMethod = PaymentMethod.Cash
        });

        // Act — query for the specific business date
        var response = await _client.GetAsync(
            $"/api/dashboard/cash-flow?businessDate={testDate:yyyy-MM-dd}&currency=2");

        var body = await response.Content.ReadAsStringAsync();
        Assert.That(response.IsSuccessStatusCode,
            $"CashFlow call failed {response.StatusCode}: {body}");

        var dto = await response.Content.ReadFromJsonAsync<DailyCashFlowDto>();
        // 500 (cash payment) + 100 (cash extra) - 50 (cash expense) = 550
        // Card extra (200) must be excluded
        Assert.That(dto!.NetCashInDrawer, Is.EqualTo(550m),
            "Net Cash must be 550: Cash payments + Cash extras - Cash expenses. Card extras excluded.");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 4: Daily reset isolation
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Seeds all data on 2026-10-01.
    /// Querying 2026-10-01 → returns non-zero.
    /// Querying 2026-10-02 (different day) → returns 0 (resets daily).
    /// </summary>
    [Test]
    public async Task ShouldResetDaily_QueriedDateReturnsOnly_ThatDaysData()
    {
        await RunAsAdministratorAsync();

        var seededDate   = new DateOnly(2026, 10, 1);
        var differentDate = new DateOnly(2026, 10, 2);
        var seededDateTime = seededDate.ToDateTime(TimeOnly.MinValue);

        // Seed reservation
        var rt = new RoomType { Name = "Standard", Capacity = 1 };
        await AddAsync(rt);
        var room = new Room { RoomNumber = "R99", RoomTypeId = rt.Id };
        await AddAsync(room);
        var res = new Reservation
        {
            GuestName = "Reset Test Guest",
            CheckInDate = seededDateTime,
            CheckOutDate = seededDateTime.AddDays(1),
            Status = ReservationStatus.CheckedIn
        };
        await AddAsync(res);

        // Seed a Paid Cash ExtraCharge on Oct 1
        await AddAsync(new ExtraCharge
        {
            ReservationId = res.Id,
            Description = "SPA on Oct 1",
            Amount = 300m,
            Date = seededDateTime,
            CurrencyCode = CurrencyCode.EGP,
            PaymentStatus = PaymentStatus.Paid,
            PaymentMethod = PaymentMethod.Cash
        });

        // Query for Oct 1 → should include the 300 (plus 0 payments - 0 expenses)
        var resp1 = await _client.GetAsync(
            $"/api/dashboard/cash-flow?businessDate={seededDate:yyyy-MM-dd}&currency=2");
        var body1 = await resp1.Content.ReadAsStringAsync();
        Assert.That(resp1.IsSuccessStatusCode, $"Oct 1 call failed: {body1}");
        var dto1 = await resp1.Content.ReadFromJsonAsync<DailyCashFlowDto>();
        Assert.That(dto1!.NetCashInDrawer, Is.GreaterThan(0m),
            "Oct 1 must have a non-zero net cash because we seeded data on that date.");

        // Query for Oct 2 → should be 0 (no data on that day)
        var resp2 = await _client.GetAsync(
            $"/api/dashboard/cash-flow?businessDate={differentDate:yyyy-MM-dd}&currency=2");
        var body2 = await resp2.Content.ReadAsStringAsync();
        Assert.That(resp2.IsSuccessStatusCode, $"Oct 2 call failed: {body2}");
        var dto2 = await resp2.Content.ReadFromJsonAsync<DailyCashFlowDto>();
        Assert.That(dto2!.NetCashInDrawer, Is.EqualTo(0m),
            "Oct 2 must be 0 — no data seeded for that date, confirming daily isolation.");
    }
}
