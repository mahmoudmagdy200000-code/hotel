using CleanArchitecture.Application.Common.Helpers;
using CleanArchitecture.Application.Common.Policies;
using CleanArchitecture.Application.Reservations.Commands.CreateReservation;

namespace CleanArchitecture.Application.Reservations.Commands.UpdateReservation;

public record UpdateReservationCommand : IRequest
{
    public int Id { get; init; }
    public string GuestName { get; init; } = string.Empty;
    public string? Phone { get; init; }
    public DateTime CheckInDate { get; init; }
    public DateTime CheckOutDate { get; init; }
    public ReservationStatus Status { get; init; }
    public bool PaidAtArrival { get; init; }
    public string Currency { get; init; } = "USD";
    public List<CreateReservationLineCommand> Lines { get; init; } = new();

    // Phase 7.1 — Financial & Hotel fields
    public string? HotelName { get; init; }
    public decimal BalanceDue { get; init; }
    public PaymentMethod PaymentMethod { get; init; } = PaymentMethod.Cash;
    public CurrencyCode CurrencyCode { get; init; } = CurrencyCode.EGP;
    public string? CurrencyOther { get; init; }
}

public class UpdateReservationCommandValidator : AbstractValidator<UpdateReservationCommand>
{
    public UpdateReservationCommandValidator()
    {
        RuleFor(v => v.GuestName)
            .NotEmpty()
            .MaximumLength(150);

        RuleFor(v => v.CheckInDate)
            .NotEmpty()
            .GreaterThanOrEqualTo(DateTime.Today)
            .WithMessage("Cannot create reservation with a past check-in date.");

        RuleFor(v => v.CheckOutDate)
            .NotEmpty()
            .GreaterThan(v => v.CheckInDate);

        RuleFor(v => v.Lines)
            .NotEmpty();

        // Phase 7.1 — Financial validations
        RuleFor(v => v.HotelName)
            .MaximumLength(120);

        RuleFor(v => v.BalanceDue)
            .GreaterThanOrEqualTo(0)
            .WithMessage("Balance due cannot be negative.");

        RuleFor(v => v.CurrencyOther)
            .NotEmpty()
            .MaximumLength(12)
            .When(v => v.CurrencyCode == CurrencyCode.Other)
            .WithMessage("CurrencyOther is required when CurrencyCode is Other and must be <= 12 characters.");

        RuleFor(v => v.CurrencyOther)
            .Empty()
            .When(v => v.CurrencyCode != CurrencyCode.Other)
            .WithMessage("CurrencyOther must be empty when CurrencyCode is not Other.");
    }
}

public class UpdateReservationCommandHandler : IRequestHandler<UpdateReservationCommand>
{
    private readonly IApplicationDbContext _context;

    public UpdateReservationCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(UpdateReservationCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.Reservations
            .Include(r => r.Lines)
            .FirstOrDefaultAsync(r => r.Id == request.Id && !r.IsDeleted, cancellationToken);

        if (entity == null)
        {
            throw new NotFoundException(nameof(Reservation), request.Id);
        }

        // 1. Status-based restriction
        if (entity.Status == ReservationStatus.CheckedOut || 
            entity.Status == ReservationStatus.Cancelled || 
            entity.Status == ReservationStatus.NoShow)
        {
            throw new InvalidOperationException($"Cannot edit reservation because it is in {entity.Status} status.");
        }

        bool headerChanged = entity.CheckInDate != request.CheckInDate || entity.CheckOutDate != request.CheckOutDate;
        bool linesChanged = request.Lines.Count != entity.Lines.Count || 
                            request.Lines.Any(rl => entity.Lines.All(el => el.RoomId != rl.RoomId));

        if (entity.Status == ReservationStatus.CheckedIn && (headerChanged || linesChanged))
        {
            throw new InvalidOperationException("Cannot change dates or rooms once checked in.");
        }

        // 2. Validate Rooms (if lines changed)
        var roomIds = request.Lines.Select(l => l.RoomId).Distinct().ToList();
        var rooms = await _context.Rooms
            .Include(r => r.RoomType)
            .Where(r => roomIds.Contains(r.Id))
            .ToListAsync(cancellationToken);

        if (rooms.Count != roomIds.Count)
        {
            throw new InvalidOperationException("One or more selected rooms do not exist.");
        }

        // 3. Check Overlaps (ONLY if current status is blocking and dates or lines changed)
        if (ReservationPolicy.IsBlocking(entity.Status) && (headerChanged || linesChanged))
        {
            foreach (var roomId in roomIds)
            {
                var overlapping = await _context.ReservationLines
                    .Include(l => l.Reservation)
                    .Where(l => l.RoomId == roomId &&
                                l.ReservationId != request.Id &&
                                !l.Reservation!.IsDeleted &&
                                ReservationPolicy.BlockingStatuses.Contains(l.Reservation!.Status) &&
                                request.CheckInDate < l.Reservation.CheckOutDate &&
                                l.Reservation.CheckInDate < request.CheckOutDate)
                    .AnyAsync(cancellationToken);

                if (overlapping)
                {
                    var roomNumber = rooms.First(r => r.Id == roomId).RoomNumber;
                    throw new InvalidOperationException($"Room {roomNumber} is not available between {request.CheckInDate:yyyy-MM-dd} and {request.CheckOutDate:yyyy-MM-dd}");
                }
            }
        }

        // 4. Update Reservation Header
        entity.GuestName = request.GuestName;
        entity.Phone = request.Phone;
        entity.CheckInDate = request.CheckInDate;
        entity.CheckOutDate = request.CheckOutDate;
        // status change is not allowed via general update in this phase 4.1 rule
        entity.PaidAtArrival = request.PaidAtArrival;
        entity.Currency = request.Currency;
        // Phase 7.1
        entity.HotelName = request.HotelName;
        entity.BalanceDue = request.BalanceDue;
        entity.PaymentMethod = request.PaymentMethod;
        entity.CurrencyCode = request.CurrencyCode;
        entity.CurrencyOther = request.CurrencyCode == CurrencyCode.Other ? request.CurrencyOther : null;

        // 5. Replace Lines
        _context.ReservationLines.RemoveRange(entity.Lines);
        entity.Lines.Clear();

        var nights = FinancialHelper.CalculateNights(request.CheckInDate, request.CheckOutDate);

        foreach (var lineItem in request.Lines)
        {
            var room = rooms.First(r => r.Id == lineItem.RoomId);
            var rate = lineItem.RatePerNight ?? room.RoomType?.DefaultRate ?? 0;
            var lineTotal = FinancialHelper.CalculateLineTotal(rate, nights);

            entity.Lines.Add(new ReservationLine
            {
                RoomId = room.Id,
                RoomTypeId = room.RoomTypeId,
                RatePerNight = Math.Round(rate, 2),
                Nights = nights,
                LineTotal = lineTotal
            });
        }

        entity.TotalAmount = FinancialHelper.CalculateTotalAmount(entity.Lines);

        await _context.SaveChangesAsync(cancellationToken);
    }
}
