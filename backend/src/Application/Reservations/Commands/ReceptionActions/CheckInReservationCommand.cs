using CleanArchitecture.Application.Common.Exceptions;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Application.Reservations.Commands.ReceptionActions;

public record CheckInReservationCommand : IRequest<ReservationStatusChangedDto>
{
    public int ReservationId { get; init; }
    public DateOnly BusinessDate { get; init; }
    public bool ForceCheckIn { get; init; }

    // Phase 7.4 — Editable fields at Check-In
    public string? GuestName { get; init; }
    public string? Phone { get; init; }
    public string? BookingNumber { get; init; }
    public DateTime? CheckInDate { get; init; }
    public DateTime? CheckOutDate { get; init; }
    public decimal? TotalAmount { get; init; }
    public decimal? BalanceDue { get; init; }
    public PaymentMethod? PaymentMethod { get; init; }
    public CurrencyCode? CurrencyCode { get; init; }
}

public class CheckInReservationCommandValidator : AbstractValidator<CheckInReservationCommand>
{
    public CheckInReservationCommandValidator()
    {
        RuleFor(v => v.TotalAmount)
            .GreaterThanOrEqualTo(0)
            .When(v => v.TotalAmount.HasValue);

        RuleFor(v => v.BalanceDue)
            .GreaterThanOrEqualTo(0)
            .When(v => v.BalanceDue.HasValue);

        RuleFor(v => v.PaymentMethod)
            .IsInEnum()
            .When(v => v.PaymentMethod.HasValue);

        RuleFor(v => v.CheckOutDate)
            .GreaterThan(v => v.CheckInDate!.Value)
            .When(v => v.CheckInDate.HasValue && v.CheckOutDate.HasValue)
            .WithMessage("Check-out date must be after check-in date.");
    }
}

public class CheckInReservationCommandHandler : IRequestHandler<CheckInReservationCommand, ReservationStatusChangedDto>
{
    private readonly IApplicationDbContext _context;

    public CheckInReservationCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ReservationStatusChangedDto> Handle(CheckInReservationCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.Reservations
            .FirstOrDefaultAsync(r => r.Id == request.ReservationId, cancellationToken);

        if (entity == null)
        {
            throw new NotFoundException(nameof(Reservation), request.ReservationId);
        }

        // Idempotency: If already in target status, return 200/current DTO
        if (entity.Status == ReservationStatus.CheckedIn)
        {
            return MapToDto(entity, request.BusinessDate);
        }

        // Validate transitions rules
        if (entity.Status != ReservationStatus.Confirmed && entity.Status != ReservationStatus.Draft)
        {
            throw new ConflictException($"Cannot check-in reservation with status {entity.Status}. Only Confirmed or Draft reservations can be checked-in.");
        }

        // Date mismatch validation: check-in date must match business date
        var reservationCheckInDate = DateOnly.FromDateTime(entity.CheckInDate);
        if (reservationCheckInDate != request.BusinessDate && !request.ForceCheckIn)
        {
            throw new ConflictException(
                $"DATE_MISMATCH: Reservation check-in date ({reservationCheckInDate:yyyy-MM-dd}) does not match today's date ({request.BusinessDate:yyyy-MM-dd}). Confirm to proceed.");
        }

        // Phase 7.4 — Apply edits BEFORE changing status
        if (!string.IsNullOrWhiteSpace(request.GuestName))
        {
            entity.GuestName = request.GuestName;
        }

        if (request.Phone != null)
        {
            entity.Phone = request.Phone;
        }

        if (!string.IsNullOrWhiteSpace(request.BookingNumber))
        {
            entity.BookingNumber = request.BookingNumber;
        }

        if (request.TotalAmount.HasValue)
        {
            entity.TotalAmount = request.TotalAmount.Value;
        }

        if (request.BalanceDue.HasValue)
        {
            entity.BalanceDue = request.BalanceDue.Value;
        }

        if (request.PaymentMethod.HasValue)
        {
            entity.PaymentMethod = request.PaymentMethod.Value;
        }

        if (request.CurrencyCode.HasValue)
        {
            entity.CurrencyCode = request.CurrencyCode.Value;
            // Also update the symbolic string if it exists
            entity.Currency = entity.CurrencyCode == CleanArchitecture.Domain.Enums.CurrencyCode.USD ? "USD" : 
                              entity.CurrencyCode == CleanArchitecture.Domain.Enums.CurrencyCode.EUR ? "EUR" : "EGP";
        }

        // Handle Date Changes + Overlap Check
        if (request.CheckInDate.HasValue || request.CheckOutDate.HasValue)
        {
            var newIn = request.CheckInDate ?? entity.CheckInDate;
            var newOut = request.CheckOutDate ?? entity.CheckOutDate;

            if (newIn != entity.CheckInDate || newOut != entity.CheckOutDate)
            {
                // Check overlaps for all rooms in this reservation
                foreach (var line in entity.Lines)
                {
                    var overlapping = await _context.ReservationLines
                        .Include(l => l.Reservation)
                        .Where(l => l.RoomId == line.RoomId &&
                                    l.ReservationId != entity.Id &&
                                    !l.Reservation!.IsDeleted &&
                                    (l.Reservation.Status == ReservationStatus.Confirmed || 
                                     l.Reservation.Status == ReservationStatus.CheckedIn ||
                                     l.Reservation.Status == ReservationStatus.CheckedOut) &&
                                    newIn < l.Reservation.CheckOutDate &&
                                    l.Reservation.CheckInDate < newOut)
                        .AnyAsync(cancellationToken);

                    if (overlapping)
                    {
                        var roomNumber = await _context.Rooms
                            .Where(r => r.Id == line.RoomId)
                            .Select(r => r.RoomNumber)
                            .FirstOrDefaultAsync(cancellationToken);
                        throw new ConflictException($"Room {roomNumber} is occupied during the selected dates.");
                    }
                }

                entity.CheckInDate = newIn;
                entity.CheckOutDate = newOut;

                // Recalculate financial breakdown for each line
                var nights = (newOut.Date - newIn.Date).Days;
                if (nights < 1) nights = 1;

                foreach (var line in entity.Lines)
                {
                    line.Nights = nights;
                    line.LineTotal = Math.Round(line.RatePerNight * nights, 2);
                }
                entity.TotalAmount = Math.Round(entity.Lines.Sum(l => l.LineTotal), 2);
            }
        }

        var oldStatus = entity.Status;
        entity.CheckIn(DateTime.UtcNow);

        await _context.SaveChangesAsync(cancellationToken);

        return MapToDto(entity, request.BusinessDate, oldStatus);
    }

    private ReservationStatusChangedDto MapToDto(CleanArchitecture.Domain.Entities.Reservation entity, DateOnly businessDate, ReservationStatus? oldStatus = null)
    {
        return new ReservationStatusChangedDto
        {
            ReservationId = entity.Id,
            OldStatus = (oldStatus ?? entity.Status).ToString(),
            NewStatus = entity.Status.ToString(),
            ChangedAtUtc = entity.CheckedInAt ?? DateTime.UtcNow,
            BusinessDate = businessDate.ToString("yyyy-MM-dd")
        };
    }
}
