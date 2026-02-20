using System.Reflection;
using CleanArchitecture.Application.Common.Interfaces;
using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace CleanArchitecture.Infrastructure.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>, IApplicationDbContext
{
    private readonly IUser _user;

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options, IUser user) : base(options)
    {
        _user = user;
    }

    public DbSet<RoomType> RoomTypes => Set<RoomType>();

    public DbSet<Room> Rooms => Set<Room>();

    public DbSet<Reservation> Reservations => Set<Reservation>();

    public DbSet<ReservationLine> ReservationLines => Set<ReservationLine>();

    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();

    public DbSet<ReservationAuditEvent> ReservationAuditEvents => Set<ReservationAuditEvent>();

    public DbSet<Expense> Expenses => Set<Expense>();

    public DbSet<Branch> Branches => Set<Branch>();

    public DbSet<BranchListing> BranchListings => Set<BranchListing>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());

        // Branch Isolation Filter
        builder.Entity<Reservation>().HasQueryFilter(r => (!r.IsDeleted) && (!_user.BranchId.HasValue || r.BranchId == _user.BranchId));
        builder.Entity<Room>().HasQueryFilter(r => !_user.BranchId.HasValue || r.BranchId == _user.BranchId);
        builder.Entity<RoomType>().HasQueryFilter(r => !_user.BranchId.HasValue || r.BranchId == _user.BranchId);
        builder.Entity<Expense>().HasQueryFilter(r => !_user.BranchId.HasValue || r.BranchId == _user.BranchId);
        builder.Entity<BranchListing>().HasQueryFilter(r => !_user.BranchId.HasValue || r.BranchId == _user.BranchId);

        // Configure default string length for MySQL compatibility
        foreach (var entity in builder.Model.GetEntityTypes())
        {
            foreach (var property in entity.GetProperties())
            {
                if (property.ClrType == typeof(string) && (property.GetMaxLength() == null))
                {
                    property.SetMaxLength(255);
                }
            }
        }
    }
}
