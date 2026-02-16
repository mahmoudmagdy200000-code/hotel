using CleanArchitecture.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Infrastructure.Services;

public class BranchResolver : IBranchResolver
{
    private readonly IApplicationDbContext _context;

    public BranchResolver(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> GetDefaultBranchIdAsync()
    {
        // For Phase 8.2, we just pick the first branch.
        // In reality, this might come from the user's claims or a default configuration.
        var branch = await _context.Branches
            .OrderBy(b => b.Name)
            .FirstOrDefaultAsync();

        if (branch == null)
        {
            // Safety fallback if seed hasn't run yet or table is empty during a weird state.
            // But with the migration and seed, this shouldn't normally happen.
            throw new InvalidOperationException("No branches found in the system. Please ensure database is seeded.");
        }

        return branch.Id;
    }
}
