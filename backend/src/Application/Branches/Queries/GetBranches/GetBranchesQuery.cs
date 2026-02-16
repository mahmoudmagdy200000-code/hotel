using CleanArchitecture.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Application.Branches.Queries.GetBranches;

public record GetBranchesQuery : IRequest<List<BranchDto>>;

public record BranchDto(Guid Id, string Name);

public class GetBranchesQueryHandler : IRequestHandler<GetBranchesQuery, List<BranchDto>>
{
    private readonly IApplicationDbContext _context;

    public GetBranchesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<BranchDto>> Handle(GetBranchesQuery request, CancellationToken cancellationToken)
    {
        return await _context.Branches
            .AsNoTracking()
            .OrderBy(b => b.Name)
            .Select(b => new BranchDto(b.Id, b.Name))
            .ToListAsync(cancellationToken);
    }
}
