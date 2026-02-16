using CleanArchitecture.Application.Reservations.Queries.GetReservations;

namespace CleanArchitecture.Application.Reservations.Queries.GetReservationById;

public record GetReservationByIdQuery(int Id) : IRequest<ReservationDto>;

public class GetReservationByIdQueryHandler : IRequestHandler<GetReservationByIdQuery, ReservationDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;

    public GetReservationByIdQueryHandler(IApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<ReservationDto> Handle(GetReservationByIdQuery request, CancellationToken cancellationToken)
    {
        var entity = await _context.Reservations
            .AsNoTracking()
            .Include(x => x.Lines)
                .ThenInclude(l => l.Room)
            .Include(x => x.Lines)
                .ThenInclude(l => l.RoomType)
            .Where(x => x.Id == request.Id && !x.IsDeleted)
            .ProjectTo<ReservationDto>(_mapper.ConfigurationProvider)
            .FirstOrDefaultAsync(cancellationToken);

        if (entity == null)
        {
            throw new NotFoundException(nameof(Reservation), request.Id);
        }

        return entity;
    }
}
