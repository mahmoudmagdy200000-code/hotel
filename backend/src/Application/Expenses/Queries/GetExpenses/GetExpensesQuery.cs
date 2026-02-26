using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Application.Expenses.Queries;
using CleanArchitecture.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Application.Expenses.Queries.GetExpenses;

public record GetExpensesQuery : IRequest<ExpensesSummaryDto>
{
    public DateTime? From { get; init; }
    public DateTime? To { get; init; }
    public ExpenseCategory? Category { get; init; }
    public CurrencyCode? Currency { get; init; }
}

public class GetExpensesQueryHandler : IRequestHandler<GetExpensesQuery, ExpensesSummaryDto>
{
    private readonly IApplicationDbContext _context;

    public GetExpensesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ExpensesSummaryDto> Handle(GetExpensesQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Expenses.AsNoTracking();

        if (request.From.HasValue)
        {
            var from = DateOnly.FromDateTime(request.From.Value);
            query = query.Where(x => x.BusinessDate >= from);
        }

        if (request.To.HasValue)
        {
            var to = DateOnly.FromDateTime(request.To.Value);
            query = query.Where(x => x.BusinessDate <= to);
        }

        if (request.Category.HasValue)
        {
            query = query.Where(x => x.Category == request.Category.Value);
        }

        if (request.Currency.HasValue)
        {
            query = query.Where(x => x.CurrencyCode == request.Currency.Value);
        }

        // Calculate total amount for the summary
        // GUIDELINE: Total amount MUST reflect only the selected currency to avoid mixing (e.g. EGP + USD).
        // If no currency is selected, we default the summary to EGP for baseline visibility.
        var summaryCurrency = request.Currency ?? CurrencyCode.EGP;
        var totalAmount = await _context.Expenses
            .AsNoTracking()
            .Where(x => x.CurrencyCode == summaryCurrency)
            // Re-apply date and branch filters for the summary if needed
            // But we can actually use the existing 'query' if we ensure we don't double filter if Currency was provided.
            .Where(x => !request.From.HasValue || x.BusinessDate >= DateOnly.FromDateTime(request.From.Value))
            .Where(x => !request.To.HasValue || x.BusinessDate <= DateOnly.FromDateTime(request.To.Value))
            .Where(x => !request.Category.HasValue || x.Category == request.Category.Value)
            .SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0m;

        var items = await query
            .OrderByDescending(x => x.BusinessDate)
            .ThenByDescending(x => x.Id)
            .Select(x => new ExpenseDto
            {
                Id = x.Id,
                BusinessDate = x.BusinessDate,
                Category = x.Category,
                Amount = x.Amount,
                CurrencyCode = x.CurrencyCode,
                CurrencyOther = x.CurrencyOther,
                PaymentMethod = x.PaymentMethod,
                Description = x.Description,
                Vendor = x.Vendor,
                Created = x.Created.DateTime
            })
            .ToListAsync(cancellationToken);

        return new ExpensesSummaryDto
        {
            Items = items,
            TotalAmount = totalAmount
        };
    }
}
