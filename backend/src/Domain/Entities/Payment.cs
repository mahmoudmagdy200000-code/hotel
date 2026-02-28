using CleanArchitecture.Domain.Common;
using CleanArchitecture.Domain.Enums;

namespace CleanArchitecture.Domain.Entities;

public class Payment : BaseAuditableEntity
{
    public int ReservationId { get; set; }
    public Reservation Reservation { get; set; } = null!;
    
    public decimal Amount { get; set; }
    public CurrencyCode CurrencyCode { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    
    public string? Notes { get; set; }
    
    public Guid BranchId { get; set; }
    public Branch Branch { get; set; } = null!;
}
