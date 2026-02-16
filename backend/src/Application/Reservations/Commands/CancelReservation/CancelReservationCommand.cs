using System.Text.Json;
using CleanArchitecture.Application.Common.Exceptions;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Application.Reservations.Commands.CancelReservation;

public record CancelReservationCommand(int Id, string? Reason = null) : IRequest;

public class CancelReservationCommandHandler : IRequestHandler<CancelReservationCommand>
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

    public async Task Handle(CancelReservationCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.Reservations
            .Include(r => r.Lines)
            .FirstOrDefaultAsync(r => r.Id == request.Id, cancellationToken);

        if (entity == null)
        {
            throw new NotFoundException(nameof(Reservation), request.Id);
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
    }
}
