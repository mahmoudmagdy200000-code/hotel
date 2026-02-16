namespace CleanArchitecture.Application.Reception.Queries.GetReceptionToday;

public record ReceptionTodayDto
{
    public string Date { get; init; } = string.Empty; // yyyy-MM-dd
    public ReceptionTodaySummaryDto Summary { get; init; } = new();
    public List<ReceptionReservationItemDto> Arrivals { get; init; } = new();
    public List<ReceptionReservationItemDto> Departures { get; init; } = new();
    public List<ReceptionReservationItemDto> InHouse { get; init; } = new();
}

public record ReceptionTodaySummaryDto
{
    public int ArrivalsCount { get; init; }
    public int DeparturesCount { get; init; }
    public int InHouseCount { get; init; }
}

public record ReceptionReservationItemDto
{
    public int ReservationId { get; init; }
    public string BookingNumber { get; init; } = string.Empty;
    public string GuestName { get; init; } = string.Empty;
    public string? Phone { get; init; }
    public string CheckIn { get; init; } = string.Empty; // yyyy-MM-dd
    public string CheckOut { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public List<string> RoomNumbers { get; init; } = new();
    public List<string> RoomTypeNames { get; init; } = new();
    public decimal BalanceDue { get; init; }
    public string Currency { get; init; } = string.Empty;
    public string PaymentMethod { get; init; } = string.Empty;
}
