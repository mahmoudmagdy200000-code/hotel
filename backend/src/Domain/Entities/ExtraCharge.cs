using CleanArchitecture.Domain.Enums;

namespace CleanArchitecture.Domain.Entities;

public class ExtraCharge : BaseAuditableEntity
{
    public int ReservationId { get; set; }
    public Reservation Reservation { get; set; } = null!;

    /// <summary>Denormalized from Reservation for branch isolation (matches production DB schema).</summary>
    public Guid BranchId { get; set; }
    public Branch Branch { get; set; } = null!;

    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
    
    public CurrencyCode CurrencyCode { get; set; } = CurrencyCode.EGP;
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;

    /// <summary>How this extra charge was settled. Defaults to Cash for backwards compatibility.
    /// Only Cash payments affect the physical Net Cash in Drawer metric.</summary>
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
}
