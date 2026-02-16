using CleanArchitecture.Application.Common.Interfaces;

namespace CleanArchitecture.Application.RoomTypes.Commands.DeleteRoomType;

public record DeleteRoomTypeCommand(int Id) : IRequest;

public class DeleteRoomTypeCommandHandler : IRequestHandler<DeleteRoomTypeCommand>
{
    private readonly IApplicationDbContext _context;

    public DeleteRoomTypeCommandHandler(IApplicationDbContext _context)
    {
        this._context = _context;
    }

    public async Task Handle(DeleteRoomTypeCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.RoomTypes
            .FindAsync(new object[] { request.Id }, cancellationToken);

        if (entity == null)
        {
            throw new NotFoundException(nameof(RoomType), request.Id);
        }

        // Check if any rooms are using this room type
        var hasRelatedRooms = await _context.Rooms
            .AnyAsync(r => r.RoomTypeId == request.Id, cancellationToken);

        if (hasRelatedRooms)
        {
            throw new InvalidOperationException("Cannot delete room type because it is being used by one or more rooms.");
        }

        _context.RoomTypes.Remove(entity);

        await _context.SaveChangesAsync(cancellationToken);
    }
}
