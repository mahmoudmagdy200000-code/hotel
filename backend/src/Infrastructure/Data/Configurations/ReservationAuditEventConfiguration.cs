using CleanArchitecture.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CleanArchitecture.Infrastructure.Data.Configurations;

public class ReservationAuditEventConfiguration : IEntityTypeConfiguration<ReservationAuditEvent>
{
    public void Configure(EntityTypeBuilder<ReservationAuditEvent> builder)
    {
        builder.ToTable("ReservationAuditEvents");

        builder.Property(t => t.ReservationId);

        builder.HasIndex(t => t.ReservationId);

        builder.Property(t => t.EventType)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(t => t.ActorUserId)
            .HasMaxLength(450)
            .IsRequired();

        builder.Property(t => t.ActorEmail)
            .HasMaxLength(256)
            .IsRequired();

        builder.HasIndex(t => t.ActorEmail);

        builder.Property(t => t.ActorRole)
            .HasMaxLength(50);

        builder.Property(t => t.Reason)
            .HasMaxLength(200);

        builder.Property(t => t.OccurredAtUtc)
            .IsRequired();

        builder.HasIndex(t => t.OccurredAtUtc);

        builder.Property(t => t.SnapshotJson);

        builder.HasOne(t => t.Reservation)
            .WithMany()
            .HasForeignKey(t => t.ReservationId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired(false);
    }
}
