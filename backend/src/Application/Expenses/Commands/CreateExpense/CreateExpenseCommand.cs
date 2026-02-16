using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Application.Expenses.Queries;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;

namespace CleanArchitecture.Application.Expenses.Commands.CreateExpense;

public record CreateExpenseCommand : IRequest<ExpenseDto>
{
    public DateOnly BusinessDate { get; init; }
    public ExpenseCategory Category { get; init; }
    public decimal Amount { get; init; }
    public CurrencyCode CurrencyCode { get; init; }
    public string? CurrencyOther { get; init; }
    public PaymentMethod PaymentMethod { get; init; }
    public string Description { get; init; } = string.Empty;
    public string? Vendor { get; init; }
}

public class CreateExpenseCommandHandler : IRequestHandler<CreateExpenseCommand, ExpenseDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _user;

    public CreateExpenseCommandHandler(IApplicationDbContext context, IUser user)
    {
        _context = context;
        _user = user;
    }

    public async Task<ExpenseDto> Handle(CreateExpenseCommand request, CancellationToken cancellationToken)
    {
        var entity = new Expense
        {
            BranchId = _user.BranchId ?? throw new ForbiddenAccessException(),
            BusinessDate = request.BusinessDate,
            Category = request.Category,
            Amount = request.Amount,
            CurrencyCode = request.CurrencyCode,
            CurrencyOther = request.CurrencyOther,
            PaymentMethod = request.PaymentMethod,
            Description = request.Description,
            Vendor = request.Vendor
        };

        _context.Expenses.Add(entity);

        await _context.SaveChangesAsync(cancellationToken);

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
