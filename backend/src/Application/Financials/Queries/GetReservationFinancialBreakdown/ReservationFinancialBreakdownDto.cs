using CleanArchitecture.Domain.Enums;

namespace CleanArchitecture.Application.Financials.Queries.GetReservationFinancialBreakdown;

public record ReservationFinancialBreakdownDto
{
    public int ReservationId { get; init; }
    public DateTime CheckInDate { get; init; }
    public DateTime CheckOutDate { get; init; }
    public int Nights { get; init; }
    public ReservationStatus Status { get; init; }
    public decimal TotalAmount { get; init; }
    public string Currency { get; init; } = string.Empty;
    public bool IsExcludedFromRevenue { get; init; }
    
    public List<ReservationLineBreakdownDto> Lines { get; init; } = new();
    public List<NightlyRevenueDto> Nightly { get; init; } = new();
}

public record ReservationLineBreakdownDto
{
    public int ReservationLineId { get; init; }
    public int RoomId { get; init; }
    public string RoomNumber { get; init; } = string.Empty;
    public int RoomTypeId { get; init; }
    public string RoomTypeName { get; init; } = string.Empty;
    public decimal RatePerNight { get; init; }
    public decimal LineTotal { get; init; }
}

public record NightlyRevenueDto
{
    public string Date { get; init; } = string.Empty; // yyyy-MM-dd
    public decimal Amount { get; init; }
}
