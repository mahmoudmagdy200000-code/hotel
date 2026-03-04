using CleanArchitecture.Domain.Enums;

namespace CleanArchitecture.Domain.Entities;

public class ExtraCharge : BaseAuditableEntity
{
    public int ReservationId { get; set; }
    public Reservation Reservation { get; set; } = null!;
    
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
    
    public CurrencyCode CurrencyCode { get; set; } = CurrencyCode.EGP;
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;
}
