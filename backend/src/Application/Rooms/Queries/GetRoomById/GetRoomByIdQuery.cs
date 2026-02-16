using CleanArchitecture.Application.Rooms.Queries.GetRooms;

namespace CleanArchitecture.Application.Rooms.Queries.GetRoomById;

public record GetRoomByIdQuery(int Id) : IRequest<RoomDto>;

public class GetRoomByIdQueryHandler : IRequestHandler<GetRoomByIdQuery, RoomDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;

    public GetRoomByIdQueryHandler(IApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<RoomDto> Handle(GetRoomByIdQuery request, CancellationToken cancellationToken)
    {
        var entity = await _context.Rooms
            .Include(r => r.RoomType)
            .AsNoTracking()
            .Where(x => x.Id == request.Id)
            .ProjectTo<RoomDto>(_mapper.ConfigurationProvider)
            .FirstOrDefaultAsync(cancellationToken);

        if (entity == null)
        {
            throw new NotFoundException(nameof(Room), request.Id);
        }

        return entity;
    }
}
