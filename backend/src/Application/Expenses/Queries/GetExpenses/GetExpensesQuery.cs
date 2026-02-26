using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Application.Expenses.Queries;
using CleanArchitecture.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Application.Expenses.Queries.GetExpenses;

public record GetExpensesQuery : IRequest<ExpensesSummaryDto>
{
    public DateOnly? From { get; init; }
    public DateOnly? To { get; init; }
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
            query = query.Where(x => x.BusinessDate >= request.From.Value);
        }

        if (request.To.HasValue)
        {
            query = query.Where(x => x.BusinessDate <= request.To.Value);
        }

        if (request.Category.HasValue)
        {
            query = query.Where(x => x.Category == request.Category.Value);
        }

        if (request.Currency.HasValue)
        {
            query = query.Where(x => x.CurrencyCode == request.Currency.Value);
        }

        // Calculate total amount for ALL filtered results (Safe Summation)
        var totalAmount = await query
            .Select(x => x.Amount)
            .DefaultIfEmpty(0)
            .SumAsync(cancellationToken);

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
