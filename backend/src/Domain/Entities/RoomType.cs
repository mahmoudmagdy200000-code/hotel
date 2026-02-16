namespace CleanArchitecture.Domain.Entities;

public class RoomType : BaseAuditableEntity
{
    public Guid BranchId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public decimal DefaultRate { get; set; }
    public bool IsActive { get; set; } = true;
}
