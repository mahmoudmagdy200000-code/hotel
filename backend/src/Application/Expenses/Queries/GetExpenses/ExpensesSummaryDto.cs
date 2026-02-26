using CleanArchitecture.Application.Expenses.Queries;

namespace CleanArchitecture.Application.Expenses.Queries.GetExpenses;

public class ExpensesSummaryDto
{
    public List<ExpenseDto> Items { get; init; } = new();
    public decimal TotalAmount { get; init; }
}
