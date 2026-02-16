using CleanArchitecture.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CleanArchitecture.Infrastructure.Data.Configurations;

public class ReservationLineConfiguration : IEntityTypeConfiguration<ReservationLine>
{
    public void Configure(EntityTypeBuilder<ReservationLine> builder)
    {
        builder.ToTable("ReservationLines");

        builder.Property(t => t.RatePerNight)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(t => t.LineTotal)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.HasOne(t => t.Room)
            .WithMany()
            .HasForeignKey(t => t.RoomId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(t => t.RoomType)
            .WithMany()
            .HasForeignKey(t => t.RoomTypeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(t => t.RoomId);
        builder.HasIndex(t => t.ReservationId);
    }
}
