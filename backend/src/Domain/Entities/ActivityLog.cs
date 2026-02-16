namespace CleanArchitecture.Domain.Entities;

public class ActivityLog : BaseEntity
{
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string? BeforeJson { get; set; }
    public string? AfterJson { get; set; }
}
