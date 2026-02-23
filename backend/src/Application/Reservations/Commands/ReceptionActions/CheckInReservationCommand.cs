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
    public List<CheckInRoomAssignmentDto>? RoomAssignments { get; init; }
}

public record CheckInRoomAssignmentDto
{
    public int LineId { get; init; }
    public int RoomId { get; init; }
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
            .Include(r => r.Lines)
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

        var dbLines = entity.Lines.ToList();

        // Phase 8.6 — Handle Room Changes
        if (request.RoomAssignments != null && request.RoomAssignments.Any())
        {
            for (int i = 0; i < request.RoomAssignments.Count; i++)
            {
                var assignment = request.RoomAssignments[i];
                
                // Try match by ID, but if counts match and it's 1-1, just take the line.
                // This is vital for PDF drafts where IDs might be 0 or desynced.
                var targetLine = dbLines.FirstOrDefault(l => l.Id == assignment.LineId) 
                                 ?? (dbLines.Count == request.RoomAssignments.Count ? dbLines[i] : null);

                if (targetLine != null)
                {
                    // Explicitly load the new room to ensure metadata is correct
                    var room = await _context.Rooms
                        .Include(r => r.RoomType)
                        .FirstOrDefaultAsync(r => r.Id == assignment.RoomId, cancellationToken);
                        
                    if (room != null)
                    {
                        targetLine.RoomId = room.Id;
                        targetLine.RoomTypeId = room.RoomTypeId;
                        targetLine.Room = room; // Force update navigation
                    }
                }
            }
        }

        // Handle Date Changes + ALWAYS check occupancy for current/new dates
        var newIn = request.CheckInDate ?? entity.CheckInDate;
        var newOut = request.CheckOutDate ?? entity.CheckOutDate;

        // Check overlaps for all rooms in this reservation
        for (int i = 0; i < dbLines.Count; i++)
        {
            var line = dbLines[i];
            var roomId = line.RoomId;
            
            // Priority 1: Use the explicit assignment from request if IDs match
            var assignment = request.RoomAssignments?.FirstOrDefault(a => a.LineId == line.Id);
            if (assignment != null)
            {
                roomId = assignment.RoomId;
            }
            // Priority 2: If it's a 1-to-1 match (single room), use the only assignment provided
            else if (request.RoomAssignments?.Count == 1 && dbLines.Count == 1)
            {
                roomId = request.RoomAssignments[0].RoomId;
            }

            // 1. Absolute Check: Is ANY other reservation CURRENTLY CheckedIn to this room?
            var currentOccupant = await _context.ReservationLines
                .Include(l => l.Reservation)
                .Where(l => l.RoomId == roomId &&
                            l.ReservationId != entity.Id &&
                            !l.Reservation!.IsDeleted &&
                            l.Reservation.Status == ReservationStatus.CheckedIn)
                .FirstOrDefaultAsync(cancellationToken);

            if (currentOccupant != null)
            {
                var roomNum = await _context.Rooms
                    .Where(r => r.Id == roomId)
                    .Select(r => r.RoomNumber)
                    .FirstOrDefaultAsync(cancellationToken);

                throw new ConflictException($"Room {roomNum} is currently occupied by {currentOccupant.Reservation?.GuestName}. The previous guest must be Checked-Out before a new Check-In can be performed for this room.");
            }

            // 2. Standard Date Overlap Check
            var overlappingLine = await _context.ReservationLines
                .Include(l => l.Reservation)
                .Where(l => l.RoomId == roomId &&
                            l.ReservationId != entity.Id &&
                            !l.Reservation!.IsDeleted &&
                            (l.Reservation.Status == ReservationStatus.Confirmed || 
                                l.Reservation.Status == ReservationStatus.CheckedIn ||
                                l.Reservation.Status == ReservationStatus.CheckedOut) &&
                            newIn.Date < l.Reservation.CheckOutDate.Date &&
                            l.Reservation.CheckInDate.Date < newOut.Date)
                .FirstOrDefaultAsync(cancellationToken);

            if (overlappingLine != null)
            {
                var roomNumber = await _context.Rooms
                    .Where(r => r.Id == roomId)
                    .Select(r => r.RoomNumber)
                    .FirstOrDefaultAsync(cancellationToken);
                    
                var existingGuest = overlappingLine.Reservation?.GuestName ?? "Unknown";
                throw new ConflictException($"Room {roomNumber} is occupied by {existingGuest} during the selected dates. Please assign a different room.");
            }
        }

        if (newIn != entity.CheckInDate || newOut != entity.CheckOutDate)
        {
            entity.CheckInDate = newIn;
            entity.CheckOutDate = newOut;

            // Recalculate nights
            var nights = (newOut.Date - newIn.Date).Days;
            if (nights < 1) nights = 1;

            foreach (var line in entity.Lines)
            {
                line.Nights = nights;
                
                // If we have a manual total from request, we'll set it at the end.
                // But we should try to keep RatePerNight consistent.
                if (request.TotalAmount.HasValue && entity.Lines.Count > 0)
                {
                    // Distribute total amount to lines if they had 0 rate (common for PDF drafts)
                    if (line.RatePerNight == 0)
                    {
                        line.RatePerNight = Math.Round(request.TotalAmount.Value / (nights * entity.Lines.Count), 2);
                    }
                    line.LineTotal = Math.Round(line.RatePerNight * nights, 2);
                }
                else
                {
                    line.LineTotal = Math.Round(line.RatePerNight * nights, 2);
                }
            }

            // Final safety: if user provided a total, USE IT. Do not overwrite with 0.
            if (request.TotalAmount.HasValue)
            {
                entity.TotalAmount = request.TotalAmount.Value;
            }
            else
            {
                entity.TotalAmount = Math.Round(entity.Lines.Sum(l => l.LineTotal), 2);
            }
        }

        // Date mismatch validation (AFTER date edits applied):
        // The final check-in date MUST match the business date
        var finalCheckInDate = DateOnly.FromDateTime(entity.CheckInDate);
        if (finalCheckInDate != request.BusinessDate)
        {
            throw new ConflictException(
                $"DATE_MISMATCH: Check-in date ({finalCheckInDate:yyyy-MM-dd}) must match today's date ({request.BusinessDate:yyyy-MM-dd}). Please update the check-in date to today before proceeding.");
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
