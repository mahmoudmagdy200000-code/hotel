using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CleanArchitecture.Infrastructure.Data.Configurations;

public class ReservationConfiguration : IEntityTypeConfiguration<Reservation>
{
    public void Configure(EntityTypeBuilder<Reservation> builder)
    {
        builder.ToTable("Reservations");

        builder.Property(t => t.BranchId)
            .IsRequired();

        builder.HasOne(t => t.Branch)
            .WithMany()
            .HasForeignKey(t => t.BranchId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(t => t.BranchId);

        builder.Property(t => t.GuestName)
            .HasMaxLength(150)
            .IsRequired();

        builder.Property(t => t.Phone)
            .HasMaxLength(30);

        builder.Property(t => t.Nationality)
            .HasMaxLength(80);

        builder.Property(t => t.BookingNumber)
            .HasMaxLength(50);
        
        builder.HasIndex(t => t.BookingNumber);

        builder.Property(t => t.Source)
            .HasConversion<int>()
            .IsRequired();
            
        builder.HasIndex(t => t.Source);

        builder.Property(t => t.Status)
            .HasConversion<int>()
            .IsRequired();

        builder.HasIndex(t => t.Status);

        builder.Property(t => t.CheckInDate)
            .IsRequired();

        builder.Property(t => t.CheckOutDate)
            .IsRequired();

        builder.HasIndex(t => new { t.CheckInDate, t.CheckOutDate });

        builder.Property(t => t.TotalAmount)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(t => t.Currency)
            .HasMaxLength(3)
            .IsFixedLength()
            .IsRequired();

        builder.Property(t => t.PaidAtArrival)
            .IsRequired();

        builder.Property(t => t.Notes)
            .HasMaxLength(1000);

        // Phase 7.1 — Financial & Hotel fields
        builder.Property(t => t.HotelName)
            .HasMaxLength(120);

        builder.Property(t => t.BalanceDue)
            .HasPrecision(18, 2)
            .HasDefaultValue(0m);

        builder.Property(t => t.PaymentMethod)
            .HasConversion<int>()
            .HasDefaultValue(PaymentMethod.Cash)
            .HasSentinel(0); // EF20601: sentinel value for enum

        builder.Property(t => t.CurrencyCode)
            .HasConversion<int>()
            .HasDefaultValue(CurrencyCode.USD)
            .HasSentinel(0); // EF20601: sentinel value for enum

        builder.Property(t => t.CurrencyOther)
            .HasMaxLength(12);

        builder.Property(t => t.ConfirmedAt);
        builder.Property(t => t.CheckedInAt);
        builder.Property(t => t.CheckedOutAt);
        builder.Property(t => t.CancelledAt);
        builder.Property(t => t.NoShowAt);

        // Soft Delete Configuration
        builder.Property(t => t.IsDeleted)
            .IsRequired()
            .HasDefaultValue(false);

        builder.HasIndex(t => t.IsDeleted);

        builder.Property(t => t.DeletedAtUtc);

        builder.Property(t => t.DeletedByUserId)
            .HasMaxLength(450);

        builder.Property(t => t.DeletedByEmail)
            .HasMaxLength(256);

        builder.Property(t => t.DeleteReason)
            .HasMaxLength(200);

        builder.HasMany(t => t.Lines)
            .WithOne(t => t.Reservation)
            .HasForeignKey(t => t.ReservationId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired(false);

        builder.Ignore(t => t.DateRange);
        builder.Ignore(t => t.Price);
    }
}

