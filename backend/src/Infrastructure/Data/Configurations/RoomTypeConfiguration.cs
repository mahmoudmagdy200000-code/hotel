using CleanArchitecture.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CleanArchitecture.Infrastructure.Data.Configurations;

public class RoomTypeConfiguration : IEntityTypeConfiguration<RoomType>
{
    public void Configure(EntityTypeBuilder<RoomType> builder)
    {
        builder.ToTable("RoomTypes");

        builder.Property(t => t.BranchId)
            .IsRequired();

        builder.HasOne<Branch>()
            .WithMany()
            .HasForeignKey(t => t.BranchId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(t => t.BranchId);

        builder.Property(t => t.Name)
            .HasMaxLength(100)
            .IsRequired();

        builder.HasIndex(t => new { t.BranchId, t.Name })
            .IsUnique();

        builder.Property(t => t.Capacity)
            .IsRequired();

        builder.Property(t => t.DefaultRate)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(t => t.IsActive)
            .HasDefaultValue(true);
    }
}
