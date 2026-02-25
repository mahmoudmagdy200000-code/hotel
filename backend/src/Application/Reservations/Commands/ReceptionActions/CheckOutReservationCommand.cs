using CleanArchitecture.Application.Common.Exceptions;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

using FluentValidation;
namespace CleanArchitecture.Application.Reservations.Commands.ReceptionActions;

public record CheckOutReservationCommand : IRequest<ReservationStatusChangedDto>
{
    public int ReservationId { get; init; }
    public DateOnly BusinessDate { get; init; }

    // Phase 8.6 — Clear balance at Check-Out
    public decimal? BalanceDue { get; init; }
    public PaymentMethod? PaymentMethod { get; init; }
}

public class CheckOutReservationCommandValidator : AbstractValidator<CheckOutReservationCommand>
{
    public CheckOutReservationCommandValidator()
    {
        RuleFor(v => v.BalanceDue)
            .GreaterThanOrEqualTo(0)
            .When(v => v.BalanceDue.HasValue);

        RuleFor(v => v.PaymentMethod)
            .IsInEnum()
            .When(v => v.PaymentMethod.HasValue);
    }
}

public class CheckOutReservationCommandHandler : IRequestHandler<CheckOutReservationCommand, ReservationStatusChangedDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _user;

    public CheckOutReservationCommandHandler(IApplicationDbContext context, IUser user)
    {
        _context = context;
        _user = user;
    }

    public async Task<ReservationStatusChangedDto> Handle(CheckOutReservationCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.Reservations
            .FirstOrDefaultAsync(r => r.Id == request.ReservationId, cancellationToken);

        if (entity == null)
        {
            throw new NotFoundException(nameof(Reservation), request.ReservationId);
        }

        // Idempotency
        if (entity.Status == ReservationStatus.CheckedOut)
        {
            return MapToDto(entity, request.BusinessDate);
        }

        // Validate transitions rules
        if (entity.Status != ReservationStatus.CheckedIn)
        {
            throw new ConflictException($"Cannot check-out reservation with status {entity.Status}. Only CheckedIn reservations can be checked-out.");
        }

        // Apply edits (e.g. clear balance) before changing status
        if (request.BalanceDue.HasValue)
        {
            entity.BalanceDue = request.BalanceDue.Value;
        }

        if (request.PaymentMethod.HasValue)
        {
            entity.PaymentMethod = request.PaymentMethod.Value;
        }

        var oldStatus = entity.Status;

        // Phase 8.8 — Fix overlapping dates on early check-out. 
        // Truncate the CheckOutDate so the room becomes instantly bookable for the freed-up days.
        var businessDateTime = request.BusinessDate.ToDateTime(TimeOnly.MinValue);
        if (entity.CheckOutDate > businessDateTime)
        {
            var nightsStayed = (businessDateTime - entity.CheckInDate).Days;
            if (nightsStayed < 0) nightsStayed = 0;

            // ExecuteUpdateAsync to prune unstayed nights natively without loading them into memory
            await _context.ReservationLines
                .Where(l => l.ReservationId == entity.Id)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(l => l.Nights, nightsStayed)
                    .SetProperty(l => l.LineTotal, l => l.RatePerNight * nightsStayed), 
                    cancellationToken);

            // Recalculate remaining total amount
            var remainingTotal = await _context.ReservationLines
                .Where(l => l.ReservationId == entity.Id)
                .SumAsync(l => l.LineTotal, cancellationToken);
                
            var priceDifference = entity.TotalAmount - remainingTotal;

            entity.TotalAmount = remainingTotal;
            if (!request.BalanceDue.HasValue) 
            {
                entity.BalanceDue = Math.Max(0, entity.BalanceDue - priceDifference);
            }

            entity.CheckOutDate = businessDateTime;
        }

        entity.CheckOut(DateTime.UtcNow);

        await _context.SaveChangesAsync(cancellationToken);

        return MapToDto(entity, request.BusinessDate, oldStatus);
    }

    private ReservationStatusChangedDto MapToDto(CleanArchitecture.Domain.Entities.Reservation entity, DateOnly businessDate, ReservationStatus? oldStatus = null)
    {
        return new ReservationStatusChangedDto
        {
            ReservationId = entity.Id,
            OldStatus = (oldStatus ?? entity.Status).ToString(),
            NewStatus = entity.Status.ToString(),
            ChangedAtUtc = entity.CheckedOutAt ?? DateTime.UtcNow,
            BusinessDate = businessDate.ToString("yyyy-MM-dd")
        };
    }
}
