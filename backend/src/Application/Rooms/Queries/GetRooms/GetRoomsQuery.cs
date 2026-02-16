namespace CleanArchitecture.Application.Rooms.Queries.GetRooms;

public record GetRoomsQuery : IRequest<List<RoomDto>>
{
    public int? RoomTypeId { get; init; }
    public bool? IsActive { get; init; }
    public string? Search { get; init; }
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
