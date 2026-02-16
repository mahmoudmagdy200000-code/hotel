namespace CleanArchitecture.Application.Financials.Queries.GetRevenueSummary;

public record RevenueSummaryDto
{
    public decimal TotalRevenue { get; init; }
    public List<RevenueSummaryItemDto> Items { get; init; } = new();
}

public record RevenueSummaryItemDto
{
    public string Key { get; init; } = string.Empty; // Date or RoomType Name
    public decimal Revenue { get; init; }
}
