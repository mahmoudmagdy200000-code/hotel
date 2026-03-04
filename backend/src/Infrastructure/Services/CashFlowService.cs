using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Infrastructure.Services;

public class CashFlowService(
    IApplicationDbContext context,
    IDateTimeProvider dateTimeProvider) : ICashFlowService
{
    public async Task<decimal> GetNetCashTodayAsync(
        DateOnly businessDate,
        CurrencyCode currency,
        CancellationToken cancellationToken)
    {
        // ── 1. Cash Payments (filtered by hotel-timezone-aware UTC boundary) ──────
        // Payment.Created is a DateTimeOffset stored in UTC by EF Core.
        // We must convert the hotel's business-day midnight to UTC first, otherwise
        // payments at e.g. 01:00 Egypt time would land in the wrong day's drawer.
        var hotelMidnightLocal = businessDate.ToDateTime(TimeOnly.MinValue);
        var startUtc = new DateTimeOffset(dateTimeProvider.ToUtc(hotelMidnightLocal), TimeSpan.Zero);
        var endUtc   = startUtc.AddDays(1); // exclusive upper bound

        var totalPayments = await context.Payments
            .Where(p => p.Created >= startUtc && p.Created < endUtc)
            .Where(p => p.CurrencyCode == currency && p.PaymentMethod == PaymentMethod.Cash)
            .SumAsync(p => p.Amount, cancellationToken);

        // ── 2. Cash Expenses (keyed by BusinessDate — already hotel-timezone) ─────
        var totalExpenses = await context.Expenses
            .Where(e => e.BusinessDate == businessDate)
            .Where(e => e.CurrencyCode == currency && e.PaymentMethod == PaymentMethod.Cash)
            .SumAsync(e => e.Amount, cancellationToken);

        // ── 3. Paid Cash Extra Charges (by business date) ────────────────────────
        // ExtraCharge.Date is a plain DateTime (hotel local), no timezone conversion needed.
        var startOfDay = businessDate.ToDateTime(TimeOnly.MinValue);
        var endOfDay   = startOfDay.AddDays(1);

        var totalExtraCharges = await context.ExtraCharges
            .Where(e => e.Date >= startOfDay && e.Date < endOfDay)
            .Where(e => e.CurrencyCode == currency
                     && e.PaymentStatus == PaymentStatus.Paid
                     && e.PaymentMethod == PaymentMethod.Cash)
            .SumAsync(e => e.Amount, cancellationToken);

        // Net = Cash In (Payments + Extra Charges) − Cash Out (Expenses)
        return totalPayments + totalExtraCharges - totalExpenses;
    }
}
