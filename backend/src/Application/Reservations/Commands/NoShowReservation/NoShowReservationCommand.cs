using CleanArchitecture.Application.Common.Interfaces;
using MediatR;

namespace CleanArchitecture.Application.Reservations.Commands.NoShowReservation;

public record NoShowReservationCommand(int Id) : IRequest;

public class NoShowReservationCommandHandler : IRequestHandler<NoShowReservationCommand>
{
    private readonly IApplicationDbContext _context;

    public NoShowReservationCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(NoShowReservationCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.Reservations
            .FindAsync(new object[] { request.Id }, cancellationToken);

        if (entity == null)
        {
            throw new NotFoundException(nameof(Reservation), request.Id);
        }

        entity.MarkNoShow(DateTime.UtcNow);

        await _context.SaveChangesAsync(cancellationToken);
    }
}
