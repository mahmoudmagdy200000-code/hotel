using System.Text.RegularExpressions;
using CleanArchitecture.Application.Common.Exceptions;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Application.Reservations.Commands.ReceptionActions;

public record ConfirmDraftReservationCommand : IRequest<ReservationStatusChangedDto>
{
    public int ReservationId { get; init; }
}

public class ConfirmDraftReservationCommandHandler : IRequestHandler<ConfirmDraftReservationCommand, ReservationStatusChangedDto>
{
    private readonly IApplicationDbContext _context;

    public ConfirmDraftReservationCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ReservationStatusChangedDto> Handle(ConfirmDraftReservationCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.Reservations
            .Include(r => r.Lines)
            .FirstOrDefaultAsync(r => r.Id == request.ReservationId, cancellationToken);

        if (entity == null)
        {
            throw new NotFoundException(nameof(Reservation), request.ReservationId);
        }

        // 1. Validate not soft-deleted
        if (entity.IsDeleted)
        {
            throw new NotFoundException(nameof(Reservation), request.ReservationId);
        }

        // 2. Idempotency - if already confirmed, return success
        if (entity.Status == ReservationStatus.Confirmed)
        {
            return MapToDto(entity, ReservationStatus.Confirmed);
        }

        // 3. Validate transition - only Draft can be confirmed
        if (entity.Status != ReservationStatus.Draft)
        {
            throw new ConflictException($"Cannot confirm reservation with status {entity.Status}. Only Draft reservations can be confirmed.");
        }

        // 4. Validate source (this workflow is for PDF uploads only)
        if (entity.Source != ReservationSource.PDF)
        {
            throw new ConflictException($"Only reservations from PDF Upload can be confirmed via this workflow.");
        }

        // 5. Business validation - required fields
        var validationFailures = new List<FluentValidation.Results.ValidationFailure>();

        // Check-in and check-out dates must be present
        if (entity.CheckInDate == default)
        {
            validationFailures.Add(new FluentValidation.Results.ValidationFailure("CheckInDate", "Check-in date is required."));
        }

        if (entity.CheckOutDate == default)
        {
            validationFailures.Add(new FluentValidation.Results.ValidationFailure("CheckOutDate", "Check-out date is required."));
        }

        // Check-out must be after check-in
        if (entity.CheckInDate != default && entity.CheckOutDate != default && entity.CheckOutDate <= entity.CheckInDate)
        {
            validationFailures.Add(new FluentValidation.Results.ValidationFailure("CheckOutDate", "Check-out date must be after check-in date."));
        }

        /* Phase 7.2: Allow past dates for PDF workflow
        // Check-in date cannot be in the past
        if (entity.CheckInDate != default && entity.CheckInDate.Date < DateTime.Today)
        {
            validationFailures.Add(new FluentValidation.Results.ValidationFailure("CheckInDate", "Cannot create reservation with a past check-in date."));
        }
        */

        // Guest identifier required (guest name OR booking number)
        bool hasGuestName = !string.IsNullOrWhiteSpace(entity.GuestName) && 
                           entity.GuestName != "PDF Guest" && 
                           entity.GuestName != "Unknown";
        bool hasBookingNumber = !string.IsNullOrWhiteSpace(entity.BookingNumber) && 
                               !entity.BookingNumber.StartsWith("PDF-");

        if (!hasGuestName && !hasBookingNumber)
        {
            validationFailures.Add(new FluentValidation.Results.ValidationFailure("GuestName", "Guest name or booking number is required."));
        }

        // At least one room must be assigned (via Lines or extracted RoomsCount)
        bool hasRoomAssignment = entity.Lines.Any();
        bool hasExtractedRooms = false;
        
        if (!hasRoomAssignment && !string.IsNullOrEmpty(entity.Notes))
        {
            var requestedRoomsStr = GetMarkerValue(entity.Notes, "EXTRACTED] RoomsCount=");
            if (int.TryParse(requestedRoomsStr, out var roomsCount) && roomsCount > 0)
            {
                hasExtractedRooms = true;
            }
        }

        if (!hasRoomAssignment && !hasExtractedRooms)
        {
            // Fallback: If absolutely no room info, allow confirm but forcing a default assignment?
            // Better: Try to find "Standard" room and assign it NOW to fix the data.
            // 1. Find occupied room IDs for this period
            var occupiedRoomIds = await _context.ReservationLines
                .Where(l => l.ReservationId != entity.Id && // exclude self
                            l.Reservation!.Status != ReservationStatus.Cancelled &&
                            l.Reservation!.CheckInDate < entity.CheckOutDate && 
                            l.Reservation!.CheckOutDate > entity.CheckInDate)
                .Select(l => l.RoomId)
                .ToListAsync(cancellationToken);

            // 2. Find first free room
            var standardRoom = await _context.Rooms
                .Include(r => r.RoomType)
                .Where(r => r.IsActive && !occupiedRoomIds.Contains(r.Id))
                .FirstOrDefaultAsync(cancellationToken);
                
            if (standardRoom != null)
            {
                // Auto-fix: Assign 1 room
                 entity.Lines.Add(new ReservationLine
                 {
                     ReservationId = entity.Id,
                     RoomId = standardRoom.Id,
                     RoomTypeId = standardRoom.RoomTypeId,
                     Nights = (entity.CheckOutDate - entity.CheckInDate).Days,
                     LineTotal = entity.TotalAmount,
                     RatePerNight = entity.TotalAmount // Simplified
                 });
                 hasRoomAssignment = true;
            }
            else 
            {
                 validationFailures.Add(new FluentValidation.Results.ValidationFailure("Lines", "At least one room must be assigned or extracted from PDF."));
            }
        }

        // Total price validation (must be >= 0)
        if (entity.TotalAmount < 0)
        {
            validationFailures.Add(new FluentValidation.Results.ValidationFailure("TotalAmount", "Total amount cannot be negative."));
        }

        if (validationFailures.Any())
        {
            throw new CleanArchitecture.Application.Common.Exceptions.ValidationException(validationFailures);
        }

        // 6. Optional: Availability Warning (MVP: non-blocking)
        string? message = null;
        if (entity.CheckInDate != default && entity.CheckOutDate != default)
        {
            message = await CalculateWarningMessage(entity, cancellationToken);
        }

        // 7. Perform confirmation
        var oldStatus = entity.Status;
        entity.Confirm(DateTime.UtcNow);

        await _context.SaveChangesAsync(cancellationToken);

        return MapToDto(entity, oldStatus, message);
    }

    private async Task<string?> CalculateWarningMessage(Reservation entity, CancellationToken cancellationToken)
    {
        var from = entity.CheckInDate;
        var to = entity.CheckOutDate;
        
        var totalActiveRooms = await _context.Rooms.CountAsync(r => r.IsActive, cancellationToken);
        var queryNights = (int)(to - from).TotalDays;
        if (queryNights <= 0) return "Invalid dates; confirmed without availability check.";
        
        var supplyRoomNights = totalActiveRooms * queryNights;

        var forecastStatuses = new[] { ReservationStatus.Confirmed, ReservationStatus.CheckedIn, ReservationStatus.CheckedOut };
        var forecastReservations = await _context.Reservations
            .Include(r => r.Lines)
            .Where(r => forecastStatuses.Contains(r.Status) && r.CheckInDate < to && r.CheckOutDate > from)
            .ToListAsync(cancellationToken);

        int totalForecastSoldRoomNights = 0;
        for (int i = 0; i < queryNights; i++)
        {
            var day = from.AddDays(i);
            totalForecastSoldRoomNights += forecastReservations
                .Where(r => r.CheckInDate <= day && r.CheckOutDate > day)
                .SelectMany(r => r.Lines)
                .Count();
        }

        var availableRoomNights = supplyRoomNights - totalForecastSoldRoomNights;
        
        // This reservation's demand (consistent with Phase 6.3)
        var requestedRoomsStr = GetMarkerValue(entity.Notes, "EXTRACTED] RoomsCount=");
        int requestedRooms = int.TryParse(requestedRoomsStr, out var n) ? n : 1;
        
        // If lines already exist (manual or partial assignment), use the larger of the two
        if (entity.Lines.Any())
        {
            var lineRoomCount = entity.Lines.Select(l => l.RoomId).Distinct().Count();
            if (lineRoomCount > requestedRooms) requestedRooms = lineRoomCount;
        }

        int itemPendingRoomNights = queryNights * requestedRooms;

        var remaining = availableRoomNights - itemPendingRoomNights;

        if (remaining < 0) return "Warning: Confirming these dates will cause OVERBOOKING.";
        if (remaining <= 1) return "Warning: Capacity is TIGHT for these dates.";

        return null;
    }

    private string GetMarkerValue(string? notes, string markerStart)
    {
        if (string.IsNullOrEmpty(notes)) return "";
        var match = Regex.Match(notes, Regex.Escape(markerStart) + @"(\d+)");
        return match.Success ? match.Groups[1].Value : "";
    }

    private ReservationStatusChangedDto MapToDto(CleanArchitecture.Domain.Entities.Reservation entity, ReservationStatus oldStatus, string? message = null)
    {
        return new ReservationStatusChangedDto
        {
            ReservationId = entity.Id,
            OldStatus = oldStatus.ToString(),
            NewStatus = entity.Status.ToString(),
            ChangedAtUtc = entity.ConfirmedAt ?? DateTime.UtcNow,
            BusinessDate = entity.CheckInDate.ToString("yyyy-MM-dd"),
            Message = message
        };
    }
}
