namespace CleanArchitecture.Application.Occupancy.Queries.GetOccupancy;

public record OccupancySummaryDto
{
    public DateTime From { get; init; }
    public DateTime To { get; init; }
    public int NightsCount { get; init; }
    public string Mode { get; init; } = string.Empty;
    public int TotalRooms { get; init; }
    public int SupplyRoomNights { get; init; }
    public int SoldRoomNights { get; init; }
    public double OccupancyRateOverall { get; init; }
    public List<OccupancyDayDto> ByDay { get; init; } = new();
    public List<OccupancyByRoomTypeDayDto> ByRoomTypeByDay { get; init; } = new();
}

public record OccupancyDayDto
{
    public string Date { get; init; } = string.Empty; // yyyy-MM-dd
    public int TotalRooms { get; init; }
    public int OccupiedRooms { get; init; }
    public double OccupancyRate { get; init; }
    public int RoomNightsSold { get; init; }
    public int AvailableRooms { get; init; }
    public bool Overbooked { get; init; }
}

public record OccupancyByRoomTypeDayDto
{
    public string Date { get; init; } = string.Empty;
    public int RoomTypeId { get; init; }
    public string? RoomTypeName { get; init; }
    // public int SupplyRoomsOfType { get; init; } // Optional, omitting for now to keep simple
    public int OccupiedRoomsOfType { get; init; }
    public int RoomNightsSoldOfType { get; init; }
}
