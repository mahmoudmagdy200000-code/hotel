namespace CleanArchitecture.Domain.Entities;

public class ReservationAuditEvent : BaseEntity
{
    public int ReservationId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string ActorUserId { get; set; } = string.Empty;
    public string ActorEmail { get; set; } = string.Empty;
    public string? ActorRole { get; set; }
    public string? Reason { get; set; }
    public DateTime OccurredAtUtc { get; set; }
    public string? SnapshotJson { get; set; }

    // Navigation property
    public Reservation? Reservation { get; set; }
}
