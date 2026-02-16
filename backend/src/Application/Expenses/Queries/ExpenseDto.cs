using CleanArchitecture.Domain.Enums;

namespace CleanArchitecture.Application.Expenses.Queries;

public class ExpenseDto
{
    public int Id { get; set; }
    public DateOnly BusinessDate { get; set; }
    public ExpenseCategory Category { get; set; }
    public decimal Amount { get; set; }
    public CurrencyCode CurrencyCode { get; set; }
    public string? CurrencyOther { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? Vendor { get; set; }
    public DateTime Created { get; set; }
}
