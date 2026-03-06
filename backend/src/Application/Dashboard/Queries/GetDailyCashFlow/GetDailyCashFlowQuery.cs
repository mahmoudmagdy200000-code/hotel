using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Application.Dashboard.Queries.GetDailyCashFlow;

// ── Item DTOs ────────────────────────────────────────────────────────────────
public record CashPaymentItemDto(int ReservationId, decimal Amount, DateTimeOffset Time);
public record CashExtraChargeItemDto(string Description, decimal Amount, DateTimeOffset Time);
public record CashExpenseItemDto(string Description, decimal Amount, DateOnly BusinessDate);
public record CashRefundItemDto(int ReservationId, decimal Amount, string? Notes, DateTimeOffset Time);

// ── Response DTO ─────────────────────────────────────────────────────────────
public record DailyCashFlowDto
{
    public decimal NetCashInDrawer { get; init; }
    public CurrencyCode Currency { get; init; }

    // Subtotals
    public decimal TotalCashPayments { get; init; }
    public decimal TotalCashExtraCharges { get; init; }
    public decimal TotalCashExpenses { get; init; }
    public decimal TotalCashRefunds { get; init; }

    // Detailed items
    public List<CashPaymentItemDto> CashPayments { get; init; } = [];
    public List<CashExtraChargeItemDto> CashExtraCharges { get; init; } = [];
    public List<CashExpenseItemDto> CashExpenses { get; init; } = [];
    public List<CashRefundItemDto> CashRefunds { get; init; } = [];
}

// ── Query ────────────────────────────────────────────────────────────────────
public record GetDailyCashFlowQuery : IRequest<DailyCashFlowDto>
{
    public DateOnly? BusinessDate { get; init; }
    public CurrencyCode? Currency { get; init; }
}

// ── Handler ──────────────────────────────────────────────────────────────────
public class GetDailyCashFlowQueryHandler(
    IApplicationDbContext context,
    IDateTimeProvider dateTimeProvider) : IRequestHandler<GetDailyCashFlowQuery, DailyCashFlowDto>
{
    public async Task<DailyCashFlowDto> Handle(GetDailyCashFlowQuery request, CancellationToken cancellationToken)
    {
        var businessDate = request.BusinessDate ?? DateOnly.FromDateTime(dateTimeProvider.GetHotelToday());
        var currency = request.Currency ?? CurrencyCode.EGP;

        // ── UTC boundaries (identical to CashFlowService) ────────────────
        var hotelMidnightLocal = businessDate.ToDateTime(TimeOnly.MinValue);
        var startUtc = new DateTimeOffset(dateTimeProvider.ToUtc(hotelMidnightLocal), TimeSpan.Zero);
        var endUtc = startUtc.AddDays(1);

        // ── 1. Cash Payments (exclude Refunds) ────────────────────────────
        var cashPayments = await context.Payments
            .Where(p => p.Created >= startUtc && p.Created < endUtc)
            .Where(p => p.CurrencyCode == currency && p.PaymentMethod == PaymentMethod.Cash)
            .Where(p => p.PaymentType == PaymentType.Payment)
            .OrderByDescending(p => p.Created)
            .Select(p => new CashPaymentItemDto(p.ReservationId, p.Amount, p.Created))
            .ToListAsync(cancellationToken);

        // ── 2. Cash Extra Charges (Paid only) ────────────────────────────
        var cashExtraCharges = await context.ExtraCharges
            .Where(e => e.Created >= startUtc && e.Created < endUtc)
            .Where(e => e.CurrencyCode == currency
                     && e.PaymentStatus == PaymentStatus.Paid
                     && e.PaymentMethod == PaymentMethod.Cash)
            .OrderByDescending(e => e.Created)
            .Select(e => new CashExtraChargeItemDto(e.Description, e.Amount, e.Created))
            .ToListAsync(cancellationToken);

        // ── 3. Cash Expenses (keyed by BusinessDate) ─────────────────────
        var cashExpenses = await context.Expenses
            .Where(e => e.BusinessDate == businessDate)
            .Where(e => e.CurrencyCode == currency && e.PaymentMethod == PaymentMethod.Cash)
            .OrderByDescending(e => e.Amount)
            .Select(e => new CashExpenseItemDto(e.Description, e.Amount, e.BusinessDate))
            .ToListAsync(cancellationToken);

        // ── 4. Cash Refunds (PaymentType == Refund) ──────────────────────
        var cashRefunds = await context.Payments
            .Where(p => p.Created >= startUtc && p.Created < endUtc)
            .Where(p => p.CurrencyCode == currency && p.PaymentMethod == PaymentMethod.Cash)
            .Where(p => p.PaymentType == PaymentType.Refund)
            .OrderByDescending(p => p.Created)
            .Select(p => new CashRefundItemDto(p.ReservationId, p.Amount, p.Notes, p.Created))
            .ToListAsync(cancellationToken);

        // ── Totals ───────────────────────────────────────────────────────
        var totalPayments = cashPayments.Sum(p => p.Amount);
        var totalExtraCharges = cashExtraCharges.Sum(e => e.Amount);
        var totalExpenses = cashExpenses.Sum(e => e.Amount);
        var totalRefunds = cashRefunds.Sum(r => r.Amount);
        var netCash = totalPayments + totalExtraCharges - totalExpenses - totalRefunds;

        return new DailyCashFlowDto
        {
            NetCashInDrawer = netCash,
            Currency = currency,
            TotalCashPayments = totalPayments,
            TotalCashExtraCharges = totalExtraCharges,
            TotalCashExpenses = totalExpenses,
            TotalCashRefunds = totalRefunds,
            CashPayments = cashPayments,
            CashExtraCharges = cashExtraCharges,
            CashExpenses = cashExpenses,
            CashRefunds = cashRefunds
        };
    }
}

