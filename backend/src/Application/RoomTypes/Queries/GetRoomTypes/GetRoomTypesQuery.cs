using CleanArchitecture.Application.Common.Interfaces;

namespace CleanArchitecture.Application.RoomTypes.Queries.GetRoomTypes;

public record GetRoomTypesQuery : IRequest<List<RoomTypeDto>>
{
    public bool? IsActive { get; init; }
}

public class GetRoomTypesQueryHandler : IRequestHandler<GetRoomTypesQuery, List<RoomTypeDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;

    public GetRoomTypesQueryHandler(IApplicationDbContext _context, IMapper _mapper)
    {
        this._context = _context;
        this._mapper = _mapper;
    }

    public async Task<List<RoomTypeDto>> Handle(GetRoomTypesQuery request, CancellationToken cancellationToken)
    {
        var query = _context.RoomTypes.AsNoTracking();

        if (request.IsActive.HasValue)
        {
            query = query.Where(x => x.IsActive == request.IsActive.Value);
        }

        return await query
            .ProjectTo<RoomTypeDto>(_mapper.ConfigurationProvider)
            .OrderBy(t => t.Name)
            .ToListAsync(cancellationToken);
    }
}
