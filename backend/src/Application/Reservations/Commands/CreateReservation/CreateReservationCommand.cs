using CleanArchitecture.Application.Common.Helpers;
using CleanArchitecture.Application.Common.Policies;
using CleanArchitecture.Application.Reservations.Queries.GetReservations;

namespace CleanArchitecture.Application.Reservations.Commands.CreateReservation;

public record CreateReservationCommand : IRequest<ReservationDto>
{
    public string GuestName { get; init; } = string.Empty;
    public string? Phone { get; init; }
    public DateTime CheckInDate { get; init; }
    public DateTime CheckOutDate { get; init; }
    public bool PaidAtArrival { get; init; } = true;
    public string Currency { get; init; } = "USD";
    public ReservationStatus Status { get; init; } = ReservationStatus.Draft;
    public List<CreateReservationLineCommand> Lines { get; init; } = new();

    // Phase 7.1 — Financial & Hotel fields
    public string? HotelName { get; init; }
    public decimal BalanceDue { get; init; }
    public PaymentMethod PaymentMethod { get; init; } = PaymentMethod.Cash;
    public CurrencyCode CurrencyCode { get; init; } = CurrencyCode.USD;
    public string? CurrencyOther { get; init; }
}

public record CreateReservationLineCommand
{
    public int RoomId { get; init; }
    public decimal? RatePerNight { get; init; }
}

public class CreateReservationCommandValidator : AbstractValidator<CreateReservationCommand>
{
    public CreateReservationCommandValidator()
    {
        RuleFor(v => v.GuestName)
            .NotEmpty()
            .MaximumLength(150);

        RuleFor(v => v.CheckInDate)
            .NotEmpty();

        RuleFor(v => v.CheckOutDate)
            .NotEmpty()
            .GreaterThan(v => v.CheckInDate)
            .WithMessage("Check-out date must be after check-in date.");

        RuleFor(v => v.Lines)
            .NotEmpty()
            .WithMessage("At least one room must be selected.");

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

public class CreateReservationCommandHandler : IRequestHandler<CreateReservationCommand, ReservationDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly IUser _user;

    public CreateReservationCommandHandler(IApplicationDbContext context, IMapper mapper, IUser user)
    {
        _context = context;
        _mapper = mapper;
        _user = user;
    }

    public async Task<ReservationDto> Handle(CreateReservationCommand request, CancellationToken cancellationToken)
    {
        // 1. Validate Rooms
        var roomIds = request.Lines.Select(l => l.RoomId).ToList();
        var rooms = await _context.Rooms
            .Include(r => r.RoomType)
            .Where(r => roomIds.Contains(r.Id))
            .ToListAsync(cancellationToken);

        if (rooms.Count != roomIds.Count)
        {
            throw new InvalidOperationException("One or more selected rooms do not exist.");
        }

        if (rooms.Any(r => !r.IsActive))
        {
            throw new InvalidOperationException("One or more selected rooms are not active.");
        }

        // 2. Check Overlaps (ONLY if status is blocking)
        if (ReservationPolicy.IsBlocking(request.Status))
        {
            foreach (var roomId in roomIds)
            {
                var overlapping = await _context.ReservationLines
                    .Include(l => l.Reservation)
                    .Where(l => l.RoomId == roomId &&
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

        // 3. Create Reservation
        var entity = new Reservation
        {
            BranchId = _user.BranchId ?? throw new ForbiddenAccessException(),
            GuestName = request.GuestName,
            Phone = request.Phone,
            CheckInDate = request.CheckInDate,
            CheckOutDate = request.CheckOutDate,
            PaidAtArrival = request.PaidAtArrival,
            Currency = request.Currency,
            Status = request.Status,
            Source = ReservationSource.Manual,
            // Phase 7.1
            HotelName = request.HotelName,
            BalanceDue = request.BalanceDue,
            PaymentMethod = request.PaymentMethod,
            CurrencyCode = request.CurrencyCode,
            CurrencyOther = request.CurrencyCode == CurrencyCode.Other ? request.CurrencyOther : null
        };

        // Sync symbolic currency string
        entity.Currency = entity.CurrencyCode == CurrencyCode.USD ? "USD" : 
                          entity.CurrencyCode == CurrencyCode.EUR ? "EUR" : 
                          entity.CurrencyCode == CurrencyCode.EGP ? "EGP" : (request.Currency ?? "USD");

        if (entity.Status == ReservationStatus.Confirmed)
        {
            entity.ConfirmedAt = DateTime.UtcNow;
        }

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

        _context.Reservations.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return _mapper.Map<ReservationDto>(entity);
    }
}
