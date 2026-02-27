using CleanArchitecture.Application.Common.Interfaces;
using MediatR;

namespace CleanArchitecture.Application.Reservations.Commands.CheckOutReservation;

public record CheckOutReservationCommand(int Id) : IRequest;

public class CheckOutReservationCommandHandler : IRequestHandler<CheckOutReservationCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _user;

    public CheckOutReservationCommandHandler(IApplicationDbContext context, IUser user)
    {
        _context = context;
        _user = user;
    }

    public async Task Handle(CheckOutReservationCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.Reservations
            .FindAsync(new object[] { request.Id }, cancellationToken);

        if (entity == null)
        {
            throw new NotFoundException(nameof(Reservation), request.Id);
        }

        var now = DateTime.UtcNow;
        entity.CheckOut(now, now);

        await _context.SaveChangesAsync(cancellationToken);
    }
}
