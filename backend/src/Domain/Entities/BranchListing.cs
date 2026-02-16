namespace CleanArchitecture.Domain.Entities;

public class BranchListing : BaseEntity<Guid>
{
    public Guid BranchId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Channel { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation property
    public Branch? Branch { get; set; }
}
