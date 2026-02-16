namespace CleanArchitecture.Application.Rooms.Commands.DeleteRoom;

public record DeleteRoomCommand(int Id) : IRequest;

public class DeleteRoomCommandHandler : IRequestHandler<DeleteRoomCommand>
{
    private readonly IApplicationDbContext _context;

    public DeleteRoomCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(DeleteRoomCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.Rooms
            .FindAsync(new object[] { request.Id }, cancellationToken);

        if (entity == null)
        {
            throw new NotFoundException(nameof(Room), request.Id);
        }

        // Business Rule: Check for linked ACTIVE reservations (exclude soft-deleted)
        var hasActiveReservations = await _context.ReservationLines
            .AnyAsync(x => x.RoomId == request.Id 
                        && x.Reservation != null 
                        && !x.Reservation.IsDeleted, cancellationToken);

        if (hasActiveReservations)
        {
            throw new InvalidOperationException("Cannot delete room because it is linked to one or more reservations.");
        }

        // Clean up orphaned ReservationLines from soft-deleted reservations
        // These still hold FK references to the room and would block deletion
        var orphanedLines = await _context.ReservationLines
            .IgnoreQueryFilters()
            .Where(x => x.RoomId == request.Id 
                     && x.Reservation != null 
                     && x.Reservation.IsDeleted)
            .ToListAsync(cancellationToken);

        if (orphanedLines.Count > 0)
        {
            _context.ReservationLines.RemoveRange(orphanedLines);
        }

        _context.Rooms.Remove(entity);

        await _context.SaveChangesAsync(cancellationToken);
    }
}
