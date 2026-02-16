using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CleanArchitecture.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class UpdateReservationSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Reservations_RoomTypes_RoomTypeId",
                table: "Reservations");

            migrationBuilder.DropForeignKey(
                name: "FK_Reservations_Rooms_RoomId",
                table: "Reservations");

            migrationBuilder.DropIndex(
                name: "IX_Reservations_RoomId_CheckInDate_CheckOutDate",
                table: "Reservations");

            migrationBuilder.DropIndex(
                name: "IX_Reservations_RoomTypeId",
                table: "Reservations");

            migrationBuilder.DropColumn(
                name: "Adults",
                table: "Reservations");

            migrationBuilder.DropColumn(
                name: "RoomId",
                table: "Reservations");

            migrationBuilder.DropColumn(
                name: "RoomTypeId",
                table: "Reservations");

            migrationBuilder.RenameColumn(
                name: "GuestPhone",
                table: "Reservations",
                newName: "Phone");

            migrationBuilder.RenameColumn(
                name: "Children",
                table: "Reservations",
                newName: "PaidAtArrival");

            migrationBuilder.CreateTable(
                name: "ReservationLines",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ReservationId = table.Column<int>(type: "INTEGER", nullable: false),
                    RoomId = table.Column<int>(type: "INTEGER", nullable: false),
                    RoomTypeId = table.Column<int>(type: "INTEGER", nullable: false),
                    RatePerNight = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    Nights = table.Column<int>(type: "INTEGER", nullable: false),
                    LineTotal = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    Created = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<string>(type: "TEXT", nullable: true),
                    LastModified = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    LastModifiedBy = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReservationLines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReservationLines_Reservations_ReservationId",
                        column: x => x.ReservationId,
                        principalTable: "Reservations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ReservationLines_RoomTypes_RoomTypeId",
                        column: x => x.RoomTypeId,
                        principalTable: "RoomTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ReservationLines_Rooms_RoomId",
                        column: x => x.RoomId,
                        principalTable: "Rooms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReservationLines_ReservationId",
                table: "ReservationLines",
                column: "ReservationId");

            migrationBuilder.CreateIndex(
                name: "IX_ReservationLines_RoomId",
                table: "ReservationLines",
                column: "RoomId");

            migrationBuilder.CreateIndex(
                name: "IX_ReservationLines_RoomTypeId",
                table: "ReservationLines",
                column: "RoomTypeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReservationLines");

            migrationBuilder.RenameColumn(
                name: "Phone",
                table: "Reservations",
                newName: "GuestPhone");

            migrationBuilder.RenameColumn(
                name: "PaidAtArrival",
                table: "Reservations",
                newName: "Children");

            migrationBuilder.AddColumn<int>(
                name: "Adults",
                table: "Reservations",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "RoomId",
                table: "Reservations",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RoomTypeId",
                table: "Reservations",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Reservations_RoomId_CheckInDate_CheckOutDate",
                table: "Reservations",
                columns: new[] { "RoomId", "CheckInDate", "CheckOutDate" });

            migrationBuilder.CreateIndex(
                name: "IX_Reservations_RoomTypeId",
                table: "Reservations",
                column: "RoomTypeId");

            migrationBuilder.AddForeignKey(
                name: "FK_Reservations_RoomTypes_RoomTypeId",
                table: "Reservations",
                column: "RoomTypeId",
                principalTable: "RoomTypes",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Reservations_Rooms_RoomId",
                table: "Reservations",
                column: "RoomId",
                principalTable: "Rooms",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
