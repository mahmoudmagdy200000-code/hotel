using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CleanArchitecture.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddExtraChargePaymentMethod : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add PaymentMethod column with a default of 1 (Cash) so that:
            // (a) The ALTER TABLE is safe on a live table — MySQL fills existing rows with 1.
            // (b) All historical extra charges default to Cash, preserving financial integrity.
            migrationBuilder.AddColumn<int>(
                name: "PaymentMethod",
                table: "ExtraCharges",
                type: "int",
                nullable: false,
                defaultValue: 1); // 1 = PaymentMethod.Cash
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PaymentMethod",
                table: "ExtraCharges");
        }
    }
}
