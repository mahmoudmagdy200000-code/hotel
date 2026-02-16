using CleanArchitecture.Domain.Entities;

namespace CleanArchitecture.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<RoomType> RoomTypes { get; }

    DbSet<Room> Rooms { get; }

    DbSet<Reservation> Reservations { get; }

    DbSet<ReservationLine> ReservationLines { get; }

    DbSet<ReservationAuditEvent> ReservationAuditEvents { get; }
    
    DbSet<Expense> Expenses { get; }

    DbSet<Branch> Branches { get; }
    
    DbSet<BranchListing> BranchListings { get; }

    DbSet<ActivityLog> ActivityLogs { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
