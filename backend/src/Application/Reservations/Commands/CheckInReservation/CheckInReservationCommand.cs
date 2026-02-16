using CleanArchitecture.Application.Common.Interfaces;
using MediatR;

namespace CleanArchitecture.Application.Reservations.Commands.CheckInReservation;

public record CheckInReservationCommand(int Id) : IRequest;

public class CheckInReservationCommandHandler : IRequestHandler<CheckInReservationCommand>
{
    private readonly IApplicationDbContext _context;

    public CheckInReservationCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(CheckInReservationCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.Reservations
            .FindAsync(new object[] { request.Id }, cancellationToken);

        if (entity == null)
        {
            throw new NotFoundException(nameof(Reservation), request.Id);
        }

        entity.CheckIn(DateTime.UtcNow);

        await _context.SaveChangesAsync(cancellationToken);
    }
}
