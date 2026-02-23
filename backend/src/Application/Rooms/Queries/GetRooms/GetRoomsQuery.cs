using CleanArchitecture.Domain.Enums;

namespace CleanArchitecture.Application.Rooms.Queries.GetRooms;

public record GetRoomsQuery : IRequest<List<RoomDto>>
{
    public int? RoomTypeId { get; init; }
    public bool? IsActive { get; init; }
    public string? Search { get; init; }
    public DateOnly? AvailableFrom { get; init; }
    public DateOnly? AvailableTo { get; init; }
    public int? ExcludeReservationId { get; init; }
}

public class GetRoomsQueryHandler : IRequestHandler<GetRoomsQuery, List<RoomDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;

    public GetRoomsQueryHandler(IApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<List<RoomDto>> Handle(GetRoomsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Rooms
            .Include(r => r.RoomType)
            .AsNoTracking();

        if (request.RoomTypeId.HasValue)
        {
            query = query.Where(x => x.RoomTypeId == request.RoomTypeId.Value);
        }

        if (request.AvailableFrom.HasValue && request.AvailableTo.HasValue)
        {
            var from = request.AvailableFrom.Value.ToDateTime(TimeOnly.MinValue);
            var to = request.AvailableTo.Value.ToDateTime(TimeOnly.MinValue);
            var excludeId = request.ExcludeReservationId ?? 0;

            var occupiedRoomIdsQuery = _context.Reservations
                .Where(r => r.Id != excludeId &&
                            r.Status != ReservationStatus.Cancelled &&
                            r.Status != ReservationStatus.NoShow &&
                            r.CheckInDate < to &&
                            r.CheckOutDate > from)
                .SelectMany(r => r.Lines
                    .Select(l => l.RoomId));

            query = query.Where(room => !occupiedRoomIdsQuery.Contains(room.Id));
        }

        if (request.IsActive.HasValue)
        {
            query = query.Where(x => x.IsActive == request.IsActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            query = query.Where(x => x.RoomNumber.Contains(request.Search));
        }

        return await query
            .ProjectTo<RoomDto>(_mapper.ConfigurationProvider)
            .OrderBy(r => r.RoomNumber)
            .ToListAsync(cancellationToken);
    }
}
