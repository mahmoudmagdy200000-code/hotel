using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using AutoMapper;
using AutoMapper.QueryableExtensions;

namespace CleanArchitecture.Application.BranchListings.Queries.GetBranchListings;

public record GetBranchListingsQuery(bool IncludeInactive = false) : IRequest<List<BranchListingDto>>;

public class GetBranchListingsQueryHandler : IRequestHandler<GetBranchListingsQuery, List<BranchListingDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly IUser _user;

    public GetBranchListingsQueryHandler(IApplicationDbContext context, IMapper mapper, IUser user)
    {
        _context = context;
        _mapper = mapper;
        _user = user;
    }

    public async Task<List<BranchListingDto>> Handle(GetBranchListingsQuery request, CancellationToken cancellationToken)
    {
        // Branch isolation is enforced by Global Query Filter in DbContext (Phase 8.4)
        // Check removed to avoid 403 if user has no branch (e.g. global admin or misconfigured user)
        // if (!_user.BranchId.HasValue)
        // {
        //     throw new ForbiddenAccessException();
        // }

        var query = _context.BranchListings.AsNoTracking();

        if (!request.IncludeInactive)
        {
            query = query.Where(x => x.IsActive);
        }

        return await query
            .ProjectTo<BranchListingDto>(_mapper.ConfigurationProvider)
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);
    }
}
