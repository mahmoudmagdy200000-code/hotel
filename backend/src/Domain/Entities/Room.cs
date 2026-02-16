namespace CleanArchitecture.Domain.Entities;

public class Room : BaseAuditableEntity
{
    public Guid BranchId { get; set; }
    public string RoomNumber { get; set; } = string.Empty;
    public int RoomTypeId { get; set; }
    public RoomType? RoomType { get; set; }
    public int? Floor { get; set; }
    public RoomStatus Status { get; set; } = RoomStatus.Available;
    public bool IsActive { get; set; } = true;
}
