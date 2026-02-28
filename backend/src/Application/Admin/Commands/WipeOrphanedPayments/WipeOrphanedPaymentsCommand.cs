using CleanArchitecture.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Application.Admin.Commands.WipeOrphanedPayments;

public record WipeOrphanedPaymentsCommand : IRequest<WipeOrphanedPaymentsResult>;

public record WipeOrphanedPaymentsResult(int DeletedCount);

public class WipeOrphanedPaymentsCommandHandler : IRequestHandler<WipeOrphanedPaymentsCommand, WipeOrphanedPaymentsResult>
{
    private readonly IApplicationDbContext _context;

    public WipeOrphanedPaymentsCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<WipeOrphanedPaymentsResult> Handle(WipeOrphanedPaymentsCommand request, CancellationToken cancellationToken)
    {
        // Find all payments whose linked reservation has been soft-deleted.
        // We must use IgnoreQueryFilters() because the global query filter on Reservations
        // excludes soft-deleted rows, making the JOIN appear as if the reservation never existed.
        var orphanedPayments = await _context.Payments
            .IgnoreQueryFilters() // Bypass branch-scope AND IsDeleted filters so we can see deleted reservations
            .Where(p => p.Reservation.IsDeleted)
            .ToListAsync(cancellationToken);

        if (orphanedPayments.Count == 0)
        {
            return new WipeOrphanedPaymentsResult(0);
        }

        _context.Payments.RemoveRange(orphanedPayments);
        await _context.SaveChangesAsync(cancellationToken);

        return new WipeOrphanedPaymentsResult(orphanedPayments.Count);
    }
}
