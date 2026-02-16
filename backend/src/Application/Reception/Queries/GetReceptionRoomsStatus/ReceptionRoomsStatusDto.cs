namespace CleanArchitecture.Application.Reception.Queries.GetReceptionRoomsStatus;

public class ReceptionRoomsStatusDto
{
    public string Date { get; set; } = string.Empty; // yyyy-MM-dd
    public List<ReceptionRoomStatusItemDto> Items { get; set; } = new();
}

public class ReceptionRoomStatusItemDto
{
    public int RoomId { get; set; }
    public string RoomNumber { get; set; } = string.Empty;
    public string RoomTypeName { get; set; } = string.Empty;
    public string Status { get; set; } = "Available"; // "Available" | "Reserved" | "Occupied"
    public ReceptionRoomStatusReservationDto? Reservation { get; set; }
}

public class ReceptionRoomStatusReservationDto
{
    public int ReservationId { get; set; }
    public string GuestName { get; set; } = string.Empty;
    public string? BookingNumber { get; set; }
    public string CheckIn { get; set; } = string.Empty; // yyyy-MM-dd
    public string CheckOut { get; set; } = string.Empty;
    public string? HotelName { get; set; }
}
