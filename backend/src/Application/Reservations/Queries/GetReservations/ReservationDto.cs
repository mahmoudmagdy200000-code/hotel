namespace CleanArchitecture.Application.Reservations.Queries.GetReservations;

public class ReservationDto
{
    public int Id { get; init; }
    public string GuestName { get; init; } = string.Empty;
    public string? Phone { get; init; }
    public DateOnly CheckInDate { get; init; }
    public DateOnly CheckOutDate { get; init; }
    public ReservationStatus Status { get; init; }
    public decimal TotalAmount { get; init; }
    public string Currency { get; init; } = string.Empty;
    public bool PaidAtArrival { get; init; }
    public int Source { get; init; }

    // Phase 7.1 — Financial & Hotel fields
    public string? HotelName { get; init; }
    public decimal BalanceDue { get; init; }
    public int PaymentMethod { get; init; }
    public int CurrencyCode { get; init; }
    public string? CurrencyOther { get; init; }
    
    public List<ReservationLineDto> Lines { get; init; } = new();

    private class Mapping : Profile
    {
        public Mapping()
        {
            CreateMap<Reservation, ReservationDto>()
                .ForMember(d => d.CheckInDate, opt => opt.MapFrom(s => DateOnly.FromDateTime(s.CheckInDate)))
                .ForMember(d => d.CheckOutDate, opt => opt.MapFrom(s => DateOnly.FromDateTime(s.CheckOutDate)))
                .ForMember(d => d.Source, opt => opt.MapFrom(s => (int)s.Source))
                .ForMember(d => d.PaymentMethod, opt => opt.MapFrom(s => (int)s.PaymentMethod))
                .ForMember(d => d.CurrencyCode, opt => opt.MapFrom(s => (int)s.CurrencyCode));
        }
    }
}

public class ReservationLineDto
{
    public int Id { get; init; }
    public int RoomId { get; init; }
    public string RoomNumber { get; init; } = string.Empty;
    public int RoomTypeId { get; init; }
    public string RoomTypeName { get; init; } = string.Empty;
    public decimal RatePerNight { get; init; }
    public int Nights { get; init; }
    public decimal LineTotal { get; init; }

    private class Mapping : Profile
    {
        public Mapping()
        {
            CreateMap<ReservationLine, ReservationLineDto>()
                .ForMember(d => d.RoomNumber, opt => opt.MapFrom(s => s.Room != null ? s.Room.RoomNumber : string.Empty))
                .ForMember(d => d.RoomTypeName, opt => opt.MapFrom(s => s.RoomType != null ? s.RoomType.Name : string.Empty));
        }
    }
}
