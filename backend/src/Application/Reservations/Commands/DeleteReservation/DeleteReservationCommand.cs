using System.Text.Json;
using CleanArchitecture.Application.Common.Exceptions;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Application.Reservations.Commands.DeleteReservation;

public record DeleteReservationCommand(int Id, string? Reason = null) : IRequest;

public class DeleteReservationCommandHandler : IRequestHandler<DeleteReservationCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _user;
    private readonly TimeProvider _timeProvider;

    public DeleteReservationCommandHandler(IApplicationDbContext context, IUser user, TimeProvider timeProvider)
    {
        _context = context;
        _user = user;
        _timeProvider = timeProvider;
    }

    public async Task Handle(DeleteReservationCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.Reservations
            .Include(r => r.Lines)
            .FirstOrDefaultAsync(r => r.Id == request.Id, cancellationToken);

        if (entity == null)
        {
            throw new NotFoundException(nameof(Reservation), request.Id);
        }

        // Capture snapshot before deletion
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
        
        // Use domain method to mark as deleted and validate state
        // Convert domain InvalidOperationException to ConflictException for 409 response
        try
        {
            entity.MarkAsDeleted(
                now,
                _user.Id,
                _user.Email,
                request.Reason);
        }
        catch (InvalidOperationException ex)
        {
            throw new ConflictException(ex.Message);
        }

        // Create audit event
        var auditEvent = new ReservationAuditEvent
        {
            ReservationId = entity.Id,
            EventType = "Deleted",
            ActorUserId = _user.Id ?? "Unknown",
            ActorEmail = _user.Email ?? "Unknown",
            ActorRole = null, // Roles could be extracted if needed, but email is required by user
            Reason = request.Reason,
            OccurredAtUtc = now,
            SnapshotJson = JsonSerializer.Serialize(snapshot)
        };

        _context.ReservationAuditEvents.Add(auditEvent);

        await _context.SaveChangesAsync(cancellationToken);
    }
}
