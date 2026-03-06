using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CleanArchitecture.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentTypeToPayments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PaymentType",
                table: "Payments",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "BranchId",
                table: "ExtraCharges",
                type: "char(36)",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<int>(
                name: "PaymentMethod",
                table: "ExtraCharges",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_ExtraCharges_BranchId",
                table: "ExtraCharges",
                column: "BranchId");

            migrationBuilder.AddForeignKey(
                name: "FK_ExtraCharges_Branches_BranchId",
                table: "ExtraCharges",
                column: "BranchId",
                principalTable: "Branches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ExtraCharges_Branches_BranchId",
                table: "ExtraCharges");

            migrationBuilder.DropIndex(
                name: "IX_ExtraCharges_BranchId",
                table: "ExtraCharges");

            migrationBuilder.DropColumn(
                name: "PaymentType",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "ExtraCharges");

            migrationBuilder.DropColumn(
                name: "PaymentMethod",
                table: "ExtraCharges");
        }
    }
}
