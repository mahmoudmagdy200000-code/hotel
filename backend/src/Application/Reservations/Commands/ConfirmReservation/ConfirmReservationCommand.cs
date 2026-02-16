using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Application.Common.Policies;
using CleanArchitecture.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using MediatR;

namespace CleanArchitecture.Application.Reservations.Commands.ConfirmReservation;

public record ConfirmReservationCommand(int Id) : IRequest;

public class ConfirmReservationCommandHandler : IRequestHandler<ConfirmReservationCommand>
{
    private readonly IApplicationDbContext _context;

    public ConfirmReservationCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(ConfirmReservationCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.Reservations
            .Include(r => r.Lines)
            .FirstOrDefaultAsync(r => r.Id == request.Id, cancellationToken);

        if (entity == null)
        {
            throw new NotFoundException(nameof(Reservation), request.Id);
        }

        // STRICT VALIDATION (Enforce completeness before Confirmation)
        var errors = new List<FluentValidation.Results.ValidationFailure>();

        if (string.IsNullOrWhiteSpace(entity.GuestName) || entity.GuestName.Equals("PDF Guest", StringComparison.OrdinalIgnoreCase))
        {
            errors.Add(new FluentValidation.Results.ValidationFailure("GuestName", "Guest Name is required (cannot be default)."));
        }

        // User specific request: Enforce Phone Validation on Confirm
        if (string.IsNullOrWhiteSpace(entity.Phone))
        {
            errors.Add(new FluentValidation.Results.ValidationFailure("Phone", "Phone number is required to confirm."));
        }

        if (entity.CheckInDate.Date < DateTime.Today && entity.Source != ReservationSource.PDF)
        {
            errors.Add(new FluentValidation.Results.ValidationFailure("CheckInDate", "Cannot confirm a reservation with a past check-in date."));
        }

        if (entity.CheckOutDate.Date <= entity.CheckInDate.Date)
        {
            errors.Add(new FluentValidation.Results.ValidationFailure("CheckOutDate", "Check-out date must be after check-in date."));
        }

        if (errors.Any())
        {
            throw new CleanArchitecture.Application.Common.Exceptions.ValidationException(errors);
        }

        // 1. Availability check (Draft -> Confirmed depends on blocking others)
        foreach (var line in entity.Lines)
        {
            var overlapping = await _context.ReservationLines
                .Include(l => l.Reservation)
                .Where(l => l.RoomId == line.RoomId &&
                            l.ReservationId != entity.Id &&
                            ReservationPolicy.BlockingStatuses.Contains(l.Reservation!.Status) &&
                            entity.CheckInDate < l.Reservation.CheckOutDate &&
                            l.Reservation.CheckInDate < entity.CheckOutDate)
                .AnyAsync(cancellationToken);

            if (overlapping)
            {
                var room = await _context.Rooms.FindAsync(new object[] { line.RoomId }, cancellationToken);
                throw new InvalidOperationException($"Room {room?.RoomNumber} is not available for the selected dates.");
            }
        }

        entity.Confirm(DateTime.UtcNow);

        await _context.SaveChangesAsync(cancellationToken);
    }
}
