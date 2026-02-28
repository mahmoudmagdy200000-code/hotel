using CleanArchitecture.Domain.Entities;
using CleanArchitecture.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CleanArchitecture.Infrastructure.Data.Configurations;

public class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        builder.ToTable("Payments");

        builder.Property(t => t.Amount)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(t => t.CurrencyCode)
            .HasConversion<int>()
            .HasDefaultValue(CurrencyCode.USD)
            .IsRequired();

        builder.Property(t => t.PaymentMethod)
            .HasConversion<int>()
            .HasDefaultValue(PaymentMethod.Cash)
            .IsRequired();

        builder.Property(t => t.Notes)
            .HasMaxLength(500);

        builder.Property(t => t.BranchId)
            .IsRequired();

        builder.HasOne(t => t.Branch)
            .WithMany()
            .HasForeignKey(t => t.BranchId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(t => t.Reservation)
            .WithMany()
            .HasForeignKey(t => t.ReservationId)
            .OnDelete(DeleteBehavior.Cascade);
            
        builder.HasIndex(t => t.BranchId);
        builder.HasIndex(t => t.ReservationId);
    }
}
