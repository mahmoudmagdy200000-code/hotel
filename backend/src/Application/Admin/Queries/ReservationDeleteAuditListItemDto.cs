namespace CleanArchitecture.Application.Admin.Queries;

public class ReservationDeleteAuditListItemDto
{
    public int Id { get; set; }
    public int ReservationId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string ActorEmail { get; set; } = string.Empty;
    public DateTime OccurredAtUtc { get; set; }
    public string? Reason { get; set; }
    public string? HotelName { get; set; }
    public string? SnapshotJson { get; set; }
}
