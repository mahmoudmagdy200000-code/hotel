using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using CleanArchitecture.Application.Common.Exceptions;
using CleanArchitecture.Application.Common.Interfaces;

namespace CleanArchitecture.Application.Reservations.Commands.ConfirmReservations;

public class ConfirmAllocationRequest
{
    public List<ConfirmAllocationItem> Approvals { get; set; } = new();
}

public class ConfirmAllocationItem
{
    public int ReservationId { get; set; }
    public List<int> SelectedRoomIds { get; set; } = new();
}

public class ConfirmAllocationResultDto
{
    public int ConfirmedCount { get; set; }
    public int FailedCount { get; set; }
    public List<ConfirmAllocationFailureDto> Failures { get; set; } = new();
}

public class ConfirmAllocationFailureDto
{
    public int ReservationId { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public record ConfirmAllocationCommand : IRequest<ConfirmAllocationResultDto>
{
    public ConfirmAllocationRequest Request { get; init; } = new();
}

public class ConfirmAllocationCommandHandler : IRequestHandler<ConfirmAllocationCommand, ConfirmAllocationResultDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeProvider _dateTimeProvider;

    public ConfirmAllocationCommandHandler(IApplicationDbContext context, IDateTimeProvider dateTimeProvider)
    {
        _context = context;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<ConfirmAllocationResultDto> Handle(ConfirmAllocationCommand command, CancellationToken cancellationToken)
    {
        var result = new ConfirmAllocationResultDto();
        var requestIds = command.Request.Approvals.Select(a => a.ReservationId).ToList();

        // Load all target reservations
        var reservations = await _context.Reservations
            .Include(r => r.Lines)
            .Where(r => requestIds.Contains(r.Id))
            .ToListAsync(cancellationToken);

        // Load all rooms (optimization: filter by selected IDs if possible, but safe to load all active)
        var allRooms = await _context.Rooms.Where(r => r.IsActive).ToListAsync(cancellationToken);

        // Load occupancy for relevant range
        var today = _dateTimeProvider.GetHotelToday();
        var minDate = reservations.Any() ? reservations.Min(d => d.CheckInDate) : today;
        var maxDate = reservations.Any() ? reservations.Max(d => d.CheckOutDate) : today.AddDays(30);
        
        var existingReservations = await _context.Reservations
            .Include(r => r.Lines)
            .Where(r => r.Status != ReservationStatus.Cancelled && 
                        r.Status != ReservationStatus.Draft && // Only confirmed/checked-in block rooms
                        r.CheckOutDate > minDate && r.CheckInDate < maxDate &&
                        !r.IsDeleted)
            .ToListAsync(cancellationToken);

        // Track rooms we allocate during this loop so we don't assign the same room twice
        var newlyAddedLines = new List<ReservationLine>();

        foreach (var approval in command.Request.Approvals)
        {
            var reservation = reservations.FirstOrDefault(r => r.Id == approval.ReservationId);
            
            if (reservation == null)
            {
                result.Failures.Add(new ConfirmAllocationFailureDto { ReservationId = approval.ReservationId, Reason = "Reservation not found" });
                result.FailedCount++;
                continue;
            }

            if (reservation.Status != ReservationStatus.Draft)
            {
                result.Failures.Add(new ConfirmAllocationFailureDto { ReservationId = approval.ReservationId, Reason = $"Invalid status: {reservation.Status}" });
                result.FailedCount++;
                continue;
            }

            // Check availability for SELECTED rooms
            // 1. Are rooms valid?
            if (!approval.SelectedRoomIds.Any())
            {
                result.Failures.Add(new ConfirmAllocationFailureDto { ReservationId = approval.ReservationId, Reason = "No room selected" });
                result.FailedCount++;
                continue;
            }

            bool conflictFound = false;
            foreach (var roomId in approval.SelectedRoomIds)
            {
                var room = allRooms.FirstOrDefault(r => r.Id == roomId);
                if (room == null)
                {
                    result.Failures.Add(new ConfirmAllocationFailureDto { ReservationId = approval.ReservationId, Reason = $"Room {roomId} not found" });
                    conflictFound = true; 
                    break;
                }

                // Check overlap against DB
                bool isOccupied = existingReservations.Any(r => 
                    r.Lines.Any(l => l.RoomId == roomId) &&
                    r.CheckInDate < reservation.CheckOutDate && 
                    r.CheckOutDate > reservation.CheckInDate
                );

                // Check overlap against newly tracked lines in this batch
                if (!isOccupied)
                {
                    isOccupied = newlyAddedLines.Any(l => 
                        l.RoomId == roomId &&
                        l.Reservation!.CheckInDate < reservation.CheckOutDate &&
                        l.Reservation!.CheckOutDate > reservation.CheckInDate
                    );
                }

                if (isOccupied)
                {
                    result.Failures.Add(new ConfirmAllocationFailureDto { ReservationId = approval.ReservationId, Reason = $"Room {room.RoomNumber} is no longer available." });
                    conflictFound = true;
                    break;
                }
            }

            if (conflictFound)
            {
                result.FailedCount++;
                continue;
            }

            // Apply Assignment
            // Clear existing lines if any (Draft lines are transient)
            _context.ReservationLines.RemoveRange(reservation.Lines);
            
            foreach (var roomId in approval.SelectedRoomIds)
            {
                var room = allRooms.First(r => r.Id == roomId);
                
                // Calculate line total pro-rated (simple division for MVP)
                var lineAmount = reservation.TotalAmount / approval.SelectedRoomIds.Count;
                var nights = (reservation.CheckOutDate - reservation.CheckInDate).Days;
                if (nights < 1) nights = 1;

                var newLine = new ReservationLine
                {
                    ReservationId = reservation.Id,
                    RoomId = roomId,
                    RoomTypeId = room.RoomTypeId,
                    Nights = nights,
                    LineTotal = lineAmount,
                    RatePerNight = Math.Round(lineAmount / nights, 2),
                    Reservation = reservation // crucial for memory tracking
                };
                
                reservation.Lines.Add(newLine);
                newlyAddedLines.Add(newLine);
            }

            reservation.Confirm(_dateTimeProvider.GetHotelTimeNow());
            result.ConfirmedCount++;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return result;
    }
}
