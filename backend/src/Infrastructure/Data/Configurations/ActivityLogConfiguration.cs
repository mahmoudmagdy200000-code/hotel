using CleanArchitecture.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CleanArchitecture.Infrastructure.Data.Configurations;

public class ActivityLogConfiguration : IEntityTypeConfiguration<ActivityLog>
{
    public void Configure(EntityTypeBuilder<ActivityLog> builder)
    {
        builder.ToTable("ActivityLogs");

        builder.Property(t => t.EntityType)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(t => t.Action)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(t => t.EntityId)
            .IsRequired();

        builder.Property(t => t.UserId)
            .HasMaxLength(100);

        builder.Property(t => t.Timestamp)
            .IsRequired();
            
        // SQLite doesn't have a native JSON type, so string is approriate.
        // If SQL Server is used later, we might want to map this to JSON.
        builder.Property(t => t.BeforeJson);
        builder.Property(t => t.AfterJson);
    }
}
