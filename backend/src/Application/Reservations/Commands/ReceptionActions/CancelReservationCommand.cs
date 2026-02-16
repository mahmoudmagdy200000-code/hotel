using CleanArchitecture.Application.Common.Exceptions;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using CleanArchitecture.Domain.Entities;

namespace CleanArchitecture.Application.Reservations.Commands.ReceptionActions;

public record CancelReservationCommand : IRequest<ReservationStatusChangedDto>
{
    public int ReservationId { get; init; }
    public string? Reason { get; init; }
}

public class CancelReservationCommandHandler : IRequestHandler<CancelReservationCommand, ReservationStatusChangedDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _user;
    private readonly TimeProvider _timeProvider;

    public CancelReservationCommandHandler(IApplicationDbContext context, IUser user, TimeProvider timeProvider)
    {
        _context = context;
        _user = user;
        _timeProvider = timeProvider;
    }

    public async Task<ReservationStatusChangedDto> Handle(CancelReservationCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.Reservations
            .Include(r => r.Lines)
            .FirstOrDefaultAsync(r => r.Id == request.ReservationId, cancellationToken);

        if (entity == null)
        {
            throw new NotFoundException(nameof(Reservation), request.ReservationId);
        }

        // Idempotency
        if (entity.Status == ReservationStatus.Cancelled)
        {
            return MapToDto(entity);
        }

        // Validate transitions rules (Reception quick action: Confirmed or Draft)
        // Draft reservations (e.g., pending PDF uploads) can be cancelled/discarded
        // Confirmed reservations can be cancelled before check-in
        var allowedStatuses = new[] { ReservationStatus.Confirmed, ReservationStatus.Draft };
        if (!allowedStatuses.Contains(entity.Status))
        {
            throw new ConflictException($"Cannot cancel reservation with status {entity.Status}. Only Confirmed or Draft reservations can be cancelled.");
        }

        if (!string.IsNullOrWhiteSpace(request.Reason))
        {
            entity.Notes = string.IsNullOrWhiteSpace(entity.Notes) 
                ? $"Cancellation Reason: {request.Reason}" 
                : $"{entity.Notes} | Cancellation Reason: {request.Reason}";
        }

        // Capture snapshot before cancellation
        var snapshot = new
        {
            entity.BookingNumber,
            entity.HotelName,
            entity.GuestName,
            entity.CheckInDate,
            entity.CheckOutDate,
            entity.Status,
            entity.TotalAmount,
            entity.Currency,
            LinesCount = entity.Lines.Count
        };

        var oldStatus = entity.Status;
        var now = _timeProvider.GetUtcNow().DateTime;
        entity.Cancel(now);

        // Create audit event
        var auditEvent = new ReservationAuditEvent
        {
            ReservationId = entity.Id,
            EventType = "Cancelled",
            ActorUserId = _user.Id ?? "Unknown",
            ActorEmail = _user.Email ?? "Unknown",
            Reason = request.Reason,
            OccurredAtUtc = now,
            SnapshotJson = JsonSerializer.Serialize(snapshot)
        };

        _context.ReservationAuditEvents.Add(auditEvent);

        await _context.SaveChangesAsync(cancellationToken);

        return MapToDto(entity, oldStatus);
    }

    private ReservationStatusChangedDto MapToDto(CleanArchitecture.Domain.Entities.Reservation entity, ReservationStatus? oldStatus = null)
    {
        return new ReservationStatusChangedDto
        {
            ReservationId = entity.Id,
            OldStatus = (oldStatus ?? entity.Status).ToString(),
            NewStatus = entity.Status.ToString(),
            ChangedAtUtc = entity.CancelledAt ?? DateTime.UtcNow,
            BusinessDate = DateTime.UtcNow.ToString("yyyy-MM-dd") // Default to today for cancellation
        };
    }
}
