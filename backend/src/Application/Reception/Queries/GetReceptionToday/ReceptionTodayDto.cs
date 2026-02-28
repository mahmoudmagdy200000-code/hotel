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
    public string? ActualCheckOut { get; init; } // yyyy-MM-dd
    public bool IsEarlyCheckOut { get; init; }
    public List<string> RoomNumbers { get; init; } = new();
    public List<string> RoomTypeNames { get; init; } = new();
    public decimal TotalAmount { get; init; }
    public decimal BalanceDue { get; init; }
    public string Currency { get; init; } = string.Empty;
    public int CurrencyCode { get; init; }
    public string PaymentMethod { get; init; } = string.Empty;
    public int Source { get; init; } // ReservationSource enum value: Manual=1, PDF=2, WhatsApp=3, Booking=4
    public bool IsPriceLocked => Source != 1; // 1 = Manual
    public string? MealPlan { get; init; }
    public List<ReceptionReservationLineDto> Lines { get; init; } = new();
}

public record ReceptionReservationLineDto
{
    public int Id { get; init; }
    public int RoomId { get; init; }
    public string RoomNumber { get; init; } = string.Empty;
    public int RoomTypeId { get; init; }
    public string RoomTypeName { get; init; } = string.Empty;
}
