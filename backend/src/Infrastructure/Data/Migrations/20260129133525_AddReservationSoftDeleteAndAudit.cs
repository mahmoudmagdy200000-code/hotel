using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CleanArchitecture.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddReservationSoftDeleteAndAudit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DeleteReason",
                table: "Reservations",
                type: "TEXT",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAtUtc",
                table: "Reservations",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeletedByEmail",
                table: "Reservations",
                type: "TEXT",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeletedByUserId",
                table: "Reservations",
                type: "TEXT",
                maxLength: 450,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Reservations",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "ReservationAuditEvents",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ReservationId = table.Column<int>(type: "INTEGER", nullable: false),
                    EventType = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    ActorUserId = table.Column<string>(type: "TEXT", maxLength: 450, nullable: false),
                    ActorEmail = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    ActorRole = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    Reason = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    OccurredAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    SnapshotJson = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReservationAuditEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReservationAuditEvents_Reservations_ReservationId",
                        column: x => x.ReservationId,
                        principalTable: "Reservations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Reservations_IsDeleted",
                table: "Reservations",
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: "IX_ReservationAuditEvents_ActorEmail",
                table: "ReservationAuditEvents",
                column: "ActorEmail");

            migrationBuilder.CreateIndex(
                name: "IX_ReservationAuditEvents_OccurredAtUtc",
                table: "ReservationAuditEvents",
                column: "OccurredAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_ReservationAuditEvents_ReservationId",
                table: "ReservationAuditEvents",
                column: "ReservationId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReservationAuditEvents");

            migrationBuilder.DropIndex(
                name: "IX_Reservations_IsDeleted",
                table: "Reservations");

            migrationBuilder.DropColumn(
                name: "DeleteReason",
                table: "Reservations");

            migrationBuilder.DropColumn(
                name: "DeletedAtUtc",
                table: "Reservations");

            migrationBuilder.DropColumn(
                name: "DeletedByEmail",
                table: "Reservations");

            migrationBuilder.DropColumn(
                name: "DeletedByUserId",
                table: "Reservations");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Reservations");
        }
    }
}
