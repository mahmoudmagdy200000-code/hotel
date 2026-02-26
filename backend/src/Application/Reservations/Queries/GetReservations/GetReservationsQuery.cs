namespace CleanArchitecture.Application.Reservations.Queries.GetReservations;

public record GetReservationsQuery : IRequest<List<ReservationDto>>
{
    public DateTime? From { get; init; }
    public DateTime? To { get; init; }
    public ReservationStatus? Status { get; init; }
    public string? SearchTerm { get; init; }
    public bool IncludeLines { get; init; } = true;
}

public class GetReservationsQueryHandler : IRequestHandler<GetReservationsQuery, List<ReservationDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;

    public GetReservationsQueryHandler(IApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<List<ReservationDto>> Handle(GetReservationsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Reservations
            .AsNoTracking();

        if (request.From.HasValue)
        {
            query = query.Where(x => x.CheckInDate >= request.From.Value);
        }

        if (request.To.HasValue)
        {
            query = query.Where(x => x.CheckInDate <= request.To.Value);
        }

        if (request.Status.HasValue)
        {
            query = query.Where(x => x.Status == request.Status.Value);
        }
        else
        {
            // Default: exclude Draft status (Draft reservations appear only in Pending Requests queue)
            // This aligns with Phase 6 workflow: Draft → Confirm → appears in Reservations list
            query = query.Where(x => x.Status != ReservationStatus.Draft);
        }

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim().ToLower();
            query = query.Where(x => 
                x.GuestName.ToLower().Contains(term) || 
                (x.BookingNumber != null && x.BookingNumber.ToLower().Contains(term)));
        }

        if (request.IncludeLines)
        {
            query = query.Include(x => x.Lines)
                         .ThenInclude(l => l.Room)
                         .Include(x => x.Lines)
                         .ThenInclude(l => l.RoomType);
        }

        return await query
            .ProjectTo<ReservationDto>(_mapper.ConfigurationProvider)
            .OrderBy(x => x.CheckInDate)
            .ToListAsync(cancellationToken);
    }
}
