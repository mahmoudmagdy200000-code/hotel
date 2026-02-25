using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CleanArchitecture.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class OptimizeReservationQueries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameIndex(
                name: "IX_ReservationLines_RoomId",
                table: "ReservationLines",
                newName: "IX_ResLines_Room");

            migrationBuilder.AlterColumn<int>(
                name: "CurrencyCode",
                table: "Reservations",
                type: "int",
                nullable: false,
                defaultValue: 2,
                oldClrType: typeof(int),
                oldType: "int",
                oldDefaultValue: 1);

            migrationBuilder.CreateIndex(
                name: "IX_Res_Branch_Status_Dates",
                table: "Reservations",
                columns: new[] { "BranchId", "Status", "CheckInDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Res_Branch_Status_Dates",
                table: "Reservations");

            migrationBuilder.RenameIndex(
                name: "IX_ResLines_Room",
                table: "ReservationLines",
                newName: "IX_ReservationLines_RoomId");

            migrationBuilder.AlterColumn<int>(
                name: "CurrencyCode",
                table: "Reservations",
                type: "int",
                nullable: false,
                defaultValue: 1,
                oldClrType: typeof(int),
                oldType: "int",
                oldDefaultValue: 2);
        }
    }
}
