namespace CleanArchitecture.Domain.Entities;

public class Reservation : BaseAuditableEntity
{
    public Guid BranchId { get; set; }
    public Branch Branch { get; set; } = null!;
    public ReservationSource Source { get; set; }
    public string? BookingNumber { get; set; }
    public string GuestName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Nationality { get; set; }
    
    public DateTime CheckInDate { get; set; }
    public DateTime CheckOutDate { get; set; }
    
    public decimal TotalAmount { get; set; }
    public string Currency { get; set; } = string.Empty;

    // Phase 7.1 — Financial & Hotel fields
    public string? HotelName { get; set; }
    public decimal BalanceDue { get; set; }
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
    public CurrencyCode CurrencyCode { get; set; } = CurrencyCode.USD;
    public string? CurrencyOther { get; set; }

    public ReservationStatus Status { get; set; } = ReservationStatus.Draft;
    public bool PaidAtArrival { get; set; } = true;
    public string? Notes { get; set; }

    public DateTime? ConfirmedAt { get; set; }
    public DateTime? CheckedInAt { get; set; }
    public DateTime? CheckedOutAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public DateTime? NoShowAt { get; set; }

    // Soft Delete Fields
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAtUtc { get; set; }
    public string? DeletedByUserId { get; set; }
    public string? DeletedByEmail { get; set; }
    public string? DeleteReason { get; set; }

    public ICollection<ReservationLine> Lines { get; private set; } = new HashSet<ReservationLine>();

    // Validation Properties using Value Objects
    public DateRange DateRange => new DateRange(CheckInDate, CheckOutDate);
    public Money Price => new Money(TotalAmount, Currency);

    public void Confirm(DateTime confirmedAt)
    {
        if (Status == ReservationStatus.Draft)
        {
            Status = ReservationStatus.Confirmed;
            ConfirmedAt = confirmedAt;
        }
        else
        {
            ThrowInvalidTransition(ReservationStatus.Confirmed);
        }
    }

    public void CheckIn(DateTime checkedInAt)
    {
        if (Status == ReservationStatus.Draft || Status == ReservationStatus.Confirmed)
        {
            Status = ReservationStatus.CheckedIn;
            CheckedInAt = checkedInAt;
        }
        else
        {
            ThrowInvalidTransition(ReservationStatus.CheckedIn);
        }
    }

    public void CheckOut(DateTime checkedOutAt)
    {
        if (Status == ReservationStatus.CheckedIn)
        {
            Status = ReservationStatus.CheckedOut;
            CheckedOutAt = checkedOutAt;
        }
        else
        {
            ThrowInvalidTransition(ReservationStatus.CheckedOut);
        }
    }

    public void Cancel(DateTime cancelledAt)
    {
        if (Status == ReservationStatus.Draft || Status == ReservationStatus.Confirmed)
        {
            Status = ReservationStatus.Cancelled;
            CancelledAt = cancelledAt;
        }
        else
        {
            ThrowInvalidTransition(ReservationStatus.Cancelled);
        }
    }

    public void MarkNoShow(DateTime noShowAt)
    {
        if (Status == ReservationStatus.Draft || Status == ReservationStatus.Confirmed)
        {
            Status = ReservationStatus.NoShow;
            NoShowAt = noShowAt;
        }
        else
        {
            ThrowInvalidTransition(ReservationStatus.NoShow);
        }
    }

    public void MarkAsDeleted(DateTime deletedAtUtc, string? userId, string? email, string? reason)
    {
        if (IsDeleted)
        {
            throw new InvalidOperationException("Reservation is already deleted.");
        }

        // Only CheckedOut reservations are fully protected from deletion.
        // Admin can delete Draft, Confirmed, CheckedIn, Cancelled, NoShow for data corrections.
        if (Status == ReservationStatus.CheckedOut)
        {
            throw new InvalidOperationException($"Cannot delete a checked-out reservation. These represent completed stays and must be preserved.");
        }

        IsDeleted = true;
        DeletedAtUtc = deletedAtUtc;
        DeletedByUserId = userId;
        DeletedByEmail = email;
        DeleteReason = reason;
    }

    private void ThrowInvalidTransition(ReservationStatus target)
    {
        throw new InvalidOperationException($"Cannot transition from {Status} to {target}.");
    }

    public void Validate()
    {
        if (CheckOutDate <= CheckInDate) throw new InvalidOperationException("Check-out must be after check-in.");
        if (Lines.Count == 0) throw new InvalidOperationException("At least one room must be selected.");
        
        // Value Objects validation
        var unusedRange = DateRange; 
        var unusedMoney = Price;
    }
}


