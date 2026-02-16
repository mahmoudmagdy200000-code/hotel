using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CleanArchitecture.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddReservationFinanceAndHotelFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "BalanceDue",
                table: "Reservations",
                type: "TEXT",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "CurrencyCode",
                table: "Reservations",
                type: "INTEGER",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<string>(
                name: "CurrencyOther",
                table: "Reservations",
                type: "TEXT",
                maxLength: 12,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HotelName",
                table: "Reservations",
                type: "TEXT",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PaymentMethod",
                table: "Reservations",
                type: "INTEGER",
                nullable: false,
                defaultValue: 1);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BalanceDue",
                table: "Reservations");

            migrationBuilder.DropColumn(
                name: "CurrencyCode",
                table: "Reservations");

            migrationBuilder.DropColumn(
                name: "CurrencyOther",
                table: "Reservations");

            migrationBuilder.DropColumn(
                name: "HotelName",
                table: "Reservations");

            migrationBuilder.DropColumn(
                name: "PaymentMethod",
                table: "Reservations");
        }
    }
}
