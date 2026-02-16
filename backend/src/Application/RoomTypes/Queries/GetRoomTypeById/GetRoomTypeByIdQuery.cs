using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Application.RoomTypes.Queries.GetRoomTypes;

namespace CleanArchitecture.Application.RoomTypes.Queries.GetRoomTypeById;

public record GetRoomTypeByIdQuery(int Id) : IRequest<RoomTypeDto>;

public class GetRoomTypeByIdQueryHandler : IRequestHandler<GetRoomTypeByIdQuery, RoomTypeDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;

    public GetRoomTypeByIdQueryHandler(IApplicationDbContext _context, IMapper _mapper)
    {
        this._context = _context;
        this._mapper = _mapper;
    }

    public async Task<RoomTypeDto> Handle(GetRoomTypeByIdQuery request, CancellationToken cancellationToken)
    {
        var entity = await _context.RoomTypes
            .AsNoTracking()
            .ProjectTo<RoomTypeDto>(_mapper.ConfigurationProvider)
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (entity == null)
        {
            throw new NotFoundException(nameof(RoomType), request.Id);
        }

        return entity;
    }
}
