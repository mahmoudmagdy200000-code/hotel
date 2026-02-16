using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CleanArchitecture.Infrastructure.Data.Configurations;

public class RoomConfiguration : IEntityTypeConfiguration<Room>
{
    public void Configure(EntityTypeBuilder<Room> builder)
    {
        builder.ToTable("Rooms");

        builder.Property(t => t.BranchId)
            .IsRequired();

        builder.HasOne<Branch>()
            .WithMany()
            .HasForeignKey(t => t.BranchId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(t => t.BranchId);

        builder.Property(t => t.RoomNumber)
            .HasMaxLength(20)
            .IsRequired();

        builder.HasIndex(t => new { t.BranchId, t.RoomNumber })
            .IsUnique();

        builder.Property(t => t.RoomTypeId)
            .IsRequired();

        builder.HasOne(t => t.RoomType)
            .WithMany()
            .HasForeignKey(t => t.RoomTypeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Property(t => t.Status)
            .HasConversion<int>()
            .IsRequired();

        builder.Property(t => t.IsActive)
            .HasDefaultValue(true);

        builder.HasIndex(t => t.RoomTypeId);
        builder.HasIndex(t => t.Status);
    }
}
