namespace CleanArchitecture.Application.Reservations.Commands.ReceptionActions;

public class ReservationStatusChangedDto
{
    public int ReservationId { get; set; }
    public string OldStatus { get; set; } = string.Empty;
    public string NewStatus { get; set; } = string.Empty;
    public DateTime ChangedAtUtc { get; set; }
    public string BusinessDate { get; set; } = string.Empty;
    public string? Message { get; set; }
}

public class ReceptionActionResultDto
{
    public ReservationStatusChangedDto StatusChange { get; set; } = null!;
    public string? Message { get; set; }
}
