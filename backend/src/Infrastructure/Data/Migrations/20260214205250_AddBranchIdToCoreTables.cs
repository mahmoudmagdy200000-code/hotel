using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CleanArchitecture.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBranchIdToCoreTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Add BranchId columns as nullable initially
            migrationBuilder.AddColumn<Guid>(
                name: "BranchId",
                table: "RoomTypes",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "BranchId",
                table: "Rooms",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "BranchId",
                table: "Reservations",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "BranchId",
                table: "Expenses",
                type: "TEXT",
                nullable: true);

            // 2. Ensure at least one branch exists and backfill
            // Note: In SQLite we use hex(randomblob) for GUID generation if needed, 
            // but here we just need to ensure the seed data or at least one row exists.
            migrationBuilder.Sql(@"
                INSERT INTO Branches (Id, Name, Created, CreatedBy, LastModified, LastModifiedBy)
                SELECT '02073994-3a95-4673-9831-2796e62c668b', 'Default Branch', '2026-02-14 00:00:00', 'Migration', '2026-02-14 00:00:00', 'Migration'
                WHERE NOT EXISTS (SELECT 1 FROM Branches);
            ");

            migrationBuilder.Sql(@"
                UPDATE RoomTypes SET BranchId = (SELECT Id FROM Branches ORDER BY Name LIMIT 1) WHERE BranchId IS NULL;
                UPDATE Rooms SET BranchId = (SELECT Id FROM Branches ORDER BY Name LIMIT 1) WHERE BranchId IS NULL;
                UPDATE Reservations SET BranchId = (SELECT Id FROM Branches ORDER BY Name LIMIT 1) WHERE BranchId IS NULL;
                UPDATE Expenses SET BranchId = (SELECT Id FROM Branches ORDER BY Name LIMIT 1) WHERE BranchId IS NULL;
            ");

            // 3. Alter columns to be NOT NULL
            migrationBuilder.AlterColumn<Guid>(
                name: "BranchId",
                table: "RoomTypes",
                type: "TEXT",
                nullable: false);

            migrationBuilder.AlterColumn<Guid>(
                name: "BranchId",
                table: "Rooms",
                type: "TEXT",
                nullable: false);

            migrationBuilder.AlterColumn<Guid>(
                name: "BranchId",
                table: "Reservations",
                type: "TEXT",
                nullable: false);

            migrationBuilder.AlterColumn<Guid>(
                name: "BranchId",
                table: "Expenses",
                type: "TEXT",
                nullable: false);

            // 4. Create Indexes and Foreign Keys
            migrationBuilder.CreateIndex(
                name: "IX_RoomTypes_BranchId",
                table: "RoomTypes",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_Rooms_BranchId",
                table: "Rooms",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_Reservations_BranchId",
                table: "Reservations",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_BranchId",
                table: "Expenses",
                column: "BranchId");

            migrationBuilder.AddForeignKey(
                name: "FK_Expenses_Branches_BranchId",
                table: "Expenses",
                column: "BranchId",
                principalTable: "Branches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Reservations_Branches_BranchId",
                table: "Reservations",
                column: "BranchId",
                principalTable: "Branches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Rooms_Branches_BranchId",
                table: "Rooms",
                column: "BranchId",
                principalTable: "Branches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_RoomTypes_Branches_BranchId",
                table: "RoomTypes",
                column: "BranchId",
                principalTable: "Branches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Expenses_Branches_BranchId",
                table: "Expenses");

            migrationBuilder.DropForeignKey(
                name: "FK_Reservations_Branches_BranchId",
                table: "Reservations");

            migrationBuilder.DropForeignKey(
                name: "FK_Rooms_Branches_BranchId",
                table: "Rooms");

            migrationBuilder.DropForeignKey(
                name: "FK_RoomTypes_Branches_BranchId",
                table: "RoomTypes");

            migrationBuilder.DropIndex(
                name: "IX_RoomTypes_BranchId",
                table: "RoomTypes");

            migrationBuilder.DropIndex(
                name: "IX_Rooms_BranchId",
                table: "Rooms");

            migrationBuilder.DropIndex(
                name: "IX_Reservations_BranchId",
                table: "Reservations");

            migrationBuilder.DropIndex(
                name: "IX_Expenses_BranchId",
                table: "Expenses");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "RoomTypes");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "Reservations");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "Expenses");
        }
    }
}
