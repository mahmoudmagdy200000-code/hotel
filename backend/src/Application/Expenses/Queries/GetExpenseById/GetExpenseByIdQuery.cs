using CleanArchitecture.Application.Common.Exceptions;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Application.Expenses.Queries;
using CleanArchitecture.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Application.Expenses.Queries.GetExpenseById;

public record GetExpenseByIdQuery(int Id) : IRequest<ExpenseDto>;

public class GetExpenseByIdQueryHandler : IRequestHandler<GetExpenseByIdQuery, ExpenseDto>
{
    private readonly IApplicationDbContext _context;

    public GetExpenseByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ExpenseDto> Handle(GetExpenseByIdQuery request, CancellationToken cancellationToken)
    {
        var entity = await _context.Expenses
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (entity == null)
        {
            throw new NotFoundException(nameof(Expense), request.Id);
        }

        return new ExpenseDto
        {
            Id = entity.Id,
            BusinessDate = entity.BusinessDate,
            Category = entity.Category,
            Amount = entity.Amount,
            CurrencyCode = entity.CurrencyCode,
            CurrencyOther = entity.CurrencyOther,
            PaymentMethod = entity.PaymentMethod,
            Description = entity.Description,
            Vendor = entity.Vendor,
            Created = entity.Created.DateTime
        };
    }
}
