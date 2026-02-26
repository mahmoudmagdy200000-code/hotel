namespace CleanArchitecture.Application.Financials.Queries.GetRevenueSummary;

public record RevenueSummaryDto
{
    public decimal TotalRevenue { get; init; }
    public List<RevenueSummaryItemDto> Items { get; init; } = new();
    public List<RevenueSummaryExpenseCategoryDto> ByExpenseCategory { get; init; } = new();
}

public record RevenueSummaryExpenseCategoryDto
{
    public int CategoryId { get; init; }
    public decimal Amount { get; init; }
}

public record RevenueSummaryItemDto
{
    public string Key { get; init; } = string.Empty; // Date or RoomType Name
    public decimal Revenue { get; init; }
}
