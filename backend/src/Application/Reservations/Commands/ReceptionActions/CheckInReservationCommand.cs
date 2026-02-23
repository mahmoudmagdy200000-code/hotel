using CleanArchitecture.Application.Common.Exceptions;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

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
    private readonly ILogger<CheckInReservationCommandHandler> _logger;

    public CheckInReservationCommandHandler(IApplicationDbContext context, ILogger<CheckInReservationCommandHandler> logger)
    {
        _context = context;
        _logger = logger;
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

        var dbLines = entity.Lines.OrderBy(l => l.Id).ToList();

        // Phase 8.6 — Handle Room Changes
        if (request.RoomAssignments != null && request.RoomAssignments.Any())
        {
            var reqAssignments = request.RoomAssignments.ToList(); // Keep original order if possible, or OrderBy if needed

            _logger.LogInformation("[CheckIn] Processing {Count} assignments for Res {ResId}. DB has {DbCount} lines.", 
                reqAssignments.Count, entity.Id, dbLines.Count);

            for (int i = 0; i < reqAssignments.Count; i++)
            {
                var assignment = reqAssignments[i];
                
                // Matching strategy:
                // 1. If LineId is provided (> 0), match by ID exactly.
                // 2. If LineId is 0 or no match found by ID, fallback to index-based matching IF counts match.
                var targetLine = assignment.LineId > 0 
                    ? dbLines.FirstOrDefault(l => l.Id == assignment.LineId)
                    : (dbLines.Count == reqAssignments.Count ? dbLines[i] : null);

                if (targetLine == null)
                {
                    _logger.LogWarning("[CheckIn] Could not match assignment at index {Index} (LineId: {LineId}) to any DB line.", i, assignment.LineId);
                    continue;
                }

                // Explicitly load the new room to ensure metadata is correct
                var room = await _context.Rooms
                    .Include(r => r.RoomType) // Include RoomType to get its Name
                    .FirstOrDefaultAsync(r => r.Id == assignment.RoomId, cancellationToken);
                
                if (room != null)
                {
                    _logger.LogInformation("[CheckIn] Updating Line {LineId} (RoomId: {OldRoomId}) to New Room {NewRoom} (Id: {RoomId})", 
                        targetLine.Id, targetLine.RoomId, room.RoomNumber, room.Id);
                    
                    targetLine.RoomId = room.Id;
                    targetLine.RoomTypeId = room.RoomTypeId; // Keep RoomTypeId updated
                    targetLine.Room = room; // Update navigation property for subsequent checks
                }
                else
                {
                    _logger.LogWarning("[CheckIn] Room with ID {RoomId} not found for assignment LineId {LineId}.", assignment.RoomId, assignment.LineId);
                }
            }
        }

        // Handle Date Changes + ALWAYS check occupancy for current/new dates
        var newIn = request.CheckInDate ?? entity.CheckInDate;
        var newOut = request.CheckOutDate ?? entity.CheckOutDate;

        // Check overlaps for all rooms in this reservation
        // We use the updated state from the previous loop (applying request changes)
        for (int i = 0; i < dbLines.Count; i++)
        {
            var line = dbLines[i];
            
            // Critical: Ensure we check the room ID that was just assigned/updated
            var roomId = line.RoomId;

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
                _logger.LogWarning("[CheckIn] Conflict detected for RoomId {RoomId} (Line {LineId})", roomId, line.Id);
                throw new ConflictException($"Room {line.Room?.RoomNumber ?? roomId.ToString()} is currently occupied or reserved by another guest for these dates. Please change the room assignment before a new Check-In can be performed for this room.");
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
