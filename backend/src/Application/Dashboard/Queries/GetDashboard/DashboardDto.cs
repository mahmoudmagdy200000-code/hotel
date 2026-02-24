namespace CleanArchitecture.Application.Dashboard.Queries.GetDashboard;

public record DashboardDto
{
    public DashboardKpiSummaryDto Summary { get; init; } = new();
    public List<DashboardSeriesPointDto> ByDay { get; init; } = new();
    public List<DashboardRoomTypeKpiDto>? ByRoomType { get; init; }
}

public record DashboardKpiSummaryDto
{
    public DateTime From { get; init; }
    public DateTime To { get; init; } // Exclusive end
    public int NightsCount { get; init; }
    public string Mode { get; init; } = "Forecast"; // Actual | Forecast
    public int TotalRooms { get; init; }
    public int SupplyRoomNights { get; init; }
    public int SoldRoomNights { get; init; }
    public double OccupancyRateOverall { get; init; }
    public decimal TotalRevenue { get; init; }
    public decimal TotalExpenses { get; init; }
    public decimal NetProfit { get; init; }
    public decimal Adr { get; init; }
    public decimal RevPar { get; init; }
}

public record DashboardSeriesPointDto
{
    public string Date { get; init; } = string.Empty; // yyyy-MM-dd
    public int TotalRooms { get; init; }
    public int OccupiedRooms { get; init; }
    public double OccupancyRate { get; init; }
    public decimal Revenue { get; init; }
    public decimal Expenses { get; init; }
    public decimal NetProfit { get; init; }
    public decimal Adr { get; init; }
    public decimal RevPar { get; init; }
}

public record DashboardRoomTypeKpiDto
{
    public int RoomTypeId { get; init; }
    public string? RoomTypeName { get; init; }
    public int SoldRoomNights { get; init; }
    public decimal Revenue { get; init; }
    public decimal Adr { get; init; }
    public double? OccupancyRate { get; init; } // Optional, only if supply known
}
