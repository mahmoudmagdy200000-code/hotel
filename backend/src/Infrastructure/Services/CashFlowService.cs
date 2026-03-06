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
            .Where(p => p.PaymentType == PaymentType.Payment)
            .SumAsync(p => p.Amount, cancellationToken);

        // ── 2. Cash Expenses (keyed by BusinessDate — already hotel-timezone) ─────
        var totalExpenses = await context.Expenses
            .Where(e => e.BusinessDate == businessDate)
            .Where(e => e.CurrencyCode == currency && e.PaymentMethod == PaymentMethod.Cash)
            .SumAsync(e => e.Amount, cancellationToken);

        // ── 3. Paid Cash Extra Charges (by business date) ────────────────────────

        // Use `Created` (the UTC DateTimeOffset stamped by AuditableEntityInterceptor) rather than
        // `Date` (a client-supplied DateTime whose Kind=Utc from JSON deserialization creates
        // a silent Kind mismatch when compared against local-midnight bounds).
        // This is identical in shape to the Payments query — consistent, timezone-safe.
        var totalExtraCharges = await context.ExtraCharges
            .Where(e => e.Created >= startUtc && e.Created < endUtc)
            .Where(e => e.CurrencyCode == currency
                     && e.PaymentStatus == PaymentStatus.Paid
                     && e.PaymentMethod == PaymentMethod.Cash)
            .SumAsync(e => e.Amount, cancellationToken);

        // ── 4. Cash Refunds (Folio Adjustments) ──────────────────────────────────
        var totalRefunds = await context.Payments
            .Where(p => p.Created >= startUtc && p.Created < endUtc)
            .Where(p => p.CurrencyCode == currency && p.PaymentMethod == PaymentMethod.Cash)
            .Where(p => p.PaymentType == PaymentType.Refund)
            .SumAsync(p => p.Amount, cancellationToken);

        // Net = Cash In (Payments + Extra Charges) − Cash Out (Expenses + Refunds)
        return totalPayments + totalExtraCharges - totalExpenses - totalRefunds;
    }
}

