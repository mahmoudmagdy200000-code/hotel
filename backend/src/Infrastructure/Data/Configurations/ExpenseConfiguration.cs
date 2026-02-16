using CleanArchitecture.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CleanArchitecture.Infrastructure.Data.Configurations;

public class ExpenseConfiguration : IEntityTypeConfiguration<Expense>
{
    public void Configure(EntityTypeBuilder<Expense> builder)
    {
        builder.ToTable("Expenses");

        builder.HasKey(x => x.Id);

        builder.Property(t => t.BranchId)
            .IsRequired();

        builder.HasOne<Branch>()
            .WithMany()
            .HasForeignKey(t => t.BranchId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(t => t.BranchId);

        builder.Property(t => t.Description)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(t => t.Vendor)
            .HasMaxLength(120);

        builder.Property(t => t.CurrencyOther)
            .HasMaxLength(12);

        builder.Property(t => t.Amount)
            .HasPrecision(18, 2);

        builder.HasIndex(x => x.BusinessDate);
        builder.HasIndex(x => x.Category);
        builder.HasIndex(x => x.CurrencyCode);
    }
}
