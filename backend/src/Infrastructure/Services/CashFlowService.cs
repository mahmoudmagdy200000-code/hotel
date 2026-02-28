using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Infrastructure.Services;

public class CashFlowService : ICashFlowService
{
    private readonly IApplicationDbContext _context;

    public CashFlowService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<decimal> GetNetCashTodayAsync(DateOnly businessDate, CurrencyCode currency, CancellationToken cancellationToken)
    {
        // 1. Total Cash Payments Today (Physical timestamp)
        // We filter by payments created on the physical day corresponding to the business date
        var startOfDay = new DateTimeOffset(businessDate.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        var endOfDay = startOfDay.AddDays(1);

        var totalPayments = await _context.Payments
            .Where(p => p.Created >= startOfDay && p.Created < endOfDay)
            .Where(p => p.CurrencyCode == currency && p.PaymentMethod == PaymentMethod.Cash)
            .SumAsync(p => p.Amount, cancellationToken);

        // 2. Total Cash Expenses Today (Business Date + Payment Method Cash)
        var totalExpenses = await _context.Expenses
            .Where(e => e.BusinessDate == businessDate)
            .Where(e => e.CurrencyCode == currency && e.PaymentMethod == PaymentMethod.Cash)
            .SumAsync(e => e.Amount, cancellationToken);

        return totalPayments - totalExpenses;
    }
}
