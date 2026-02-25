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
    private readonly IDateTimeProvider _dateTimeProvider;

    public ConfirmReservationCommandHandler(IApplicationDbContext context, IDateTimeProvider dateTimeProvider)
    {
        _context = context;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task Handle(ConfirmReservationCommand request, CancellationToken cancellationToken)
    {
        var dbContext = (DbContext)_context;
        using var transaction = await dbContext.Database.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted, cancellationToken);
        try
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

            if (entity.CheckInDate.Date < _dateTimeProvider.GetHotelToday() && entity.Source != ReservationSource.PDF)
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
                // Lock the Room row to prevent parallel booking
                var roomInfo = await _context.Rooms
                    .FromSqlInterpolated($"SELECT * FROM Rooms WHERE Id = {line.RoomId} FOR UPDATE")
                    .AsTracking()
                    .FirstOrDefaultAsync(cancellationToken);

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
                    throw new InvalidOperationException($"Room {roomInfo?.RoomNumber} is not available for the selected dates.");
                }
            }

            entity.Confirm(_dateTimeProvider.GetHotelTimeNow());

            await _context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }
}
