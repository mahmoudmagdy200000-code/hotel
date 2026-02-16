namespace CleanArchitecture.Domain.Entities;

public class ReservationLine : BaseAuditableEntity
{
    public int ReservationId { get; set; }
    public Reservation? Reservation { get; set; }

    public int RoomId { get; set; }
    public Room? Room { get; set; }

    public int RoomTypeId { get; set; }
    public RoomType? RoomType { get; set; }

    public decimal RatePerNight { get; set; }

    public int Nights { get; set; }
    public decimal LineTotal { get; set; }
}
