CREATE TABLE IF NOT EXISTS `__EFMigrationsHistory` (
    `MigrationId` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
    `ProductVersion` varchar(32) CHARACTER SET utf8mb4 NOT NULL,
    CONSTRAINT `PK___EFMigrationsHistory` PRIMARY KEY (`MigrationId`)
) CHARACTER SET=utf8mb4;

START TRANSACTION;
ALTER DATABASE CHARACTER SET utf8mb4;

CREATE TABLE `ActivityLogs` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `EntityType` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `EntityId` longtext CHARACTER SET utf8mb4 NOT NULL,
    `Action` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `UserId` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `Timestamp` datetime(6) NOT NULL,
    `BeforeJson` longtext CHARACTER SET utf8mb4 NULL,
    `AfterJson` longtext CHARACTER SET utf8mb4 NULL,
    CONSTRAINT `PK_ActivityLogs` PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;

CREATE TABLE `AspNetRoles` (
    `Id` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `Name` varchar(256) CHARACTER SET utf8mb4 NULL,
    `NormalizedName` varchar(255) CHARACTER SET utf8mb4 NULL,
    `ConcurrencyStamp` longtext CHARACTER SET utf8mb4 NULL,
    CONSTRAINT `PK_AspNetRoles` PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;

CREATE TABLE `AspNetUsers` (
    `Id` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `BranchId` char(36) COLLATE ascii_general_ci NULL,
    `UserName` varchar(256) CHARACTER SET utf8mb4 NULL,
    `NormalizedUserName` varchar(255) CHARACTER SET utf8mb4 NULL,
    `Email` varchar(256) CHARACTER SET utf8mb4 NULL,
    `NormalizedEmail` varchar(255) CHARACTER SET utf8mb4 NULL,
    `EmailConfirmed` tinyint(1) NOT NULL,
    `PasswordHash` longtext CHARACTER SET utf8mb4 NULL,
    `SecurityStamp` longtext CHARACTER SET utf8mb4 NULL,
    `ConcurrencyStamp` longtext CHARACTER SET utf8mb4 NULL,
    `PhoneNumber` longtext CHARACTER SET utf8mb4 NULL,
    `PhoneNumberConfirmed` tinyint(1) NOT NULL,
    `TwoFactorEnabled` tinyint(1) NOT NULL,
    `LockoutEnd` datetime(6) NULL,
    `LockoutEnabled` tinyint(1) NOT NULL,
    `AccessFailedCount` int NOT NULL,
    CONSTRAINT `PK_AspNetUsers` PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;

CREATE TABLE `Branches` (
    `Id` char(36) COLLATE ascii_general_ci NOT NULL,
    `Name` varchar(120) CHARACTER SET utf8mb4 NOT NULL,
    `Created` datetime(6) NOT NULL,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `LastModified` datetime(6) NOT NULL,
    `LastModifiedBy` longtext CHARACTER SET utf8mb4 NULL,
    CONSTRAINT `PK_Branches` PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;

CREATE TABLE `AspNetRoleClaims` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `RoleId` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `ClaimType` longtext CHARACTER SET utf8mb4 NULL,
    `ClaimValue` longtext CHARACTER SET utf8mb4 NULL,
    CONSTRAINT `PK_AspNetRoleClaims` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_AspNetRoleClaims_AspNetRoles_RoleId` FOREIGN KEY (`RoleId`) REFERENCES `AspNetRoles` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE `AspNetUserClaims` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `UserId` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `ClaimType` longtext CHARACTER SET utf8mb4 NULL,
    `ClaimValue` longtext CHARACTER SET utf8mb4 NULL,
    CONSTRAINT `PK_AspNetUserClaims` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_AspNetUserClaims_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE `AspNetUserLogins` (
    `LoginProvider` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `ProviderKey` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `ProviderDisplayName` longtext CHARACTER SET utf8mb4 NULL,
    `UserId` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    CONSTRAINT `PK_AspNetUserLogins` PRIMARY KEY (`LoginProvider`, `ProviderKey`),
    CONSTRAINT `FK_AspNetUserLogins_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE `AspNetUserRoles` (
    `UserId` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `RoleId` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    CONSTRAINT `PK_AspNetUserRoles` PRIMARY KEY (`UserId`, `RoleId`),
    CONSTRAINT `FK_AspNetUserRoles_AspNetRoles_RoleId` FOREIGN KEY (`RoleId`) REFERENCES `AspNetRoles` (`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_AspNetUserRoles_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE `AspNetUserTokens` (
    `UserId` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `LoginProvider` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `Name` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `Value` longtext CHARACTER SET utf8mb4 NULL,
    CONSTRAINT `PK_AspNetUserTokens` PRIMARY KEY (`UserId`, `LoginProvider`, `Name`),
    CONSTRAINT `FK_AspNetUserTokens_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE `BranchListings` (
    `Id` char(36) COLLATE ascii_general_ci NOT NULL,
    `BranchId` char(36) COLLATE ascii_general_ci NOT NULL,
    `Name` varchar(120) CHARACTER SET utf8mb4 NOT NULL,
    `Channel` varchar(20) CHARACTER SET utf8mb4 NULL,
    `IsActive` tinyint(1) NOT NULL DEFAULT TRUE,
    CONSTRAINT `PK_BranchListings` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_BranchListings_Branches_BranchId` FOREIGN KEY (`BranchId`) REFERENCES `Branches` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE `Expenses` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `BranchId` char(36) COLLATE ascii_general_ci NOT NULL,
    `BusinessDate` date NOT NULL,
    `Category` int NOT NULL,
    `Amount` decimal(18,2) NOT NULL,
    `CurrencyCode` int NOT NULL,
    `CurrencyOther` varchar(12) CHARACTER SET utf8mb4 NULL,
    `PaymentMethod` int NOT NULL,
    `Description` varchar(200) CHARACTER SET utf8mb4 NOT NULL,
    `Vendor` varchar(120) CHARACTER SET utf8mb4 NULL,
    `Created` datetime(6) NOT NULL,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `LastModified` datetime(6) NOT NULL,
    `LastModifiedBy` longtext CHARACTER SET utf8mb4 NULL,
    CONSTRAINT `PK_Expenses` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_Expenses_Branches_BranchId` FOREIGN KEY (`BranchId`) REFERENCES `Branches` (`Id`) ON DELETE RESTRICT
) CHARACTER SET=utf8mb4;

CREATE TABLE `Reservations` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `BranchId` char(36) COLLATE ascii_general_ci NOT NULL,
    `Source` int NOT NULL,
    `BookingNumber` varchar(50) CHARACTER SET utf8mb4 NULL,
    `GuestName` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
    `Phone` varchar(30) CHARACTER SET utf8mb4 NULL,
    `Nationality` varchar(80) CHARACTER SET utf8mb4 NULL,
    `CheckInDate` datetime(6) NOT NULL,
    `CheckOutDate` datetime(6) NOT NULL,
    `TotalAmount` decimal(18,2) NOT NULL,
    `Currency` char(3) CHARACTER SET utf8mb4 NOT NULL,
    `HotelName` varchar(120) CHARACTER SET utf8mb4 NULL,
    `BalanceDue` decimal(18,2) NOT NULL DEFAULT 0.0,
    `PaymentMethod` int NOT NULL DEFAULT 1,
    `CurrencyCode` int NOT NULL DEFAULT 1,
    `CurrencyOther` varchar(12) CHARACTER SET utf8mb4 NULL,
    `Status` int NOT NULL,
    `PaidAtArrival` tinyint(1) NOT NULL,
    `Notes` varchar(1000) CHARACTER SET utf8mb4 NULL,
    `ConfirmedAt` datetime(6) NULL,
    `CheckedInAt` datetime(6) NULL,
    `CheckedOutAt` datetime(6) NULL,
    `CancelledAt` datetime(6) NULL,
    `NoShowAt` datetime(6) NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT FALSE,
    `DeletedAtUtc` datetime(6) NULL,
    `DeletedByUserId` varchar(450) CHARACTER SET utf8mb4 NULL,
    `DeletedByEmail` varchar(256) CHARACTER SET utf8mb4 NULL,
    `DeleteReason` varchar(200) CHARACTER SET utf8mb4 NULL,
    `Created` datetime(6) NOT NULL,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `LastModified` datetime(6) NOT NULL,
    `LastModifiedBy` longtext CHARACTER SET utf8mb4 NULL,
    CONSTRAINT `PK_Reservations` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_Reservations_Branches_BranchId` FOREIGN KEY (`BranchId`) REFERENCES `Branches` (`Id`) ON DELETE RESTRICT
) CHARACTER SET=utf8mb4;

CREATE TABLE `RoomTypes` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `BranchId` char(36) COLLATE ascii_general_ci NOT NULL,
    `Name` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `Capacity` int NOT NULL,
    `DefaultRate` decimal(18,2) NOT NULL,
    `IsActive` tinyint(1) NOT NULL DEFAULT TRUE,
    `Created` datetime(6) NOT NULL,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `LastModified` datetime(6) NOT NULL,
    `LastModifiedBy` longtext CHARACTER SET utf8mb4 NULL,
    CONSTRAINT `PK_RoomTypes` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_RoomTypes_Branches_BranchId` FOREIGN KEY (`BranchId`) REFERENCES `Branches` (`Id`) ON DELETE RESTRICT
) CHARACTER SET=utf8mb4;

CREATE TABLE `ReservationAuditEvents` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `ReservationId` int NOT NULL,
    `EventType` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `ActorUserId` varchar(450) CHARACTER SET utf8mb4 NOT NULL,
    `ActorEmail` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `ActorRole` varchar(50) CHARACTER SET utf8mb4 NULL,
    `Reason` varchar(200) CHARACTER SET utf8mb4 NULL,
    `OccurredAtUtc` datetime(6) NOT NULL,
    `SnapshotJson` longtext CHARACTER SET utf8mb4 NULL,
    CONSTRAINT `PK_ReservationAuditEvents` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_ReservationAuditEvents_Reservations_ReservationId` FOREIGN KEY (`ReservationId`) REFERENCES `Reservations` (`Id`) ON DELETE RESTRICT
) CHARACTER SET=utf8mb4;

CREATE TABLE `Rooms` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `BranchId` char(36) COLLATE ascii_general_ci NOT NULL,
    `RoomNumber` varchar(20) CHARACTER SET utf8mb4 NOT NULL,
    `RoomTypeId` int NOT NULL,
    `Floor` int NULL,
    `Status` int NOT NULL,
    `IsActive` tinyint(1) NOT NULL DEFAULT TRUE,
    `Created` datetime(6) NOT NULL,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `LastModified` datetime(6) NOT NULL,
    `LastModifiedBy` longtext CHARACTER SET utf8mb4 NULL,
    CONSTRAINT `PK_Rooms` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_Rooms_Branches_BranchId` FOREIGN KEY (`BranchId`) REFERENCES `Branches` (`Id`) ON DELETE RESTRICT,
    CONSTRAINT `FK_Rooms_RoomTypes_RoomTypeId` FOREIGN KEY (`RoomTypeId`) REFERENCES `RoomTypes` (`Id`) ON DELETE RESTRICT
) CHARACTER SET=utf8mb4;

CREATE TABLE `ReservationLines` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `ReservationId` int NOT NULL,
    `RoomId` int NOT NULL,
    `RoomTypeId` int NOT NULL,
    `RatePerNight` decimal(18,2) NOT NULL,
    `Nights` int NOT NULL,
    `LineTotal` decimal(18,2) NOT NULL,
    `Created` datetime(6) NOT NULL,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `LastModified` datetime(6) NOT NULL,
    `LastModifiedBy` longtext CHARACTER SET utf8mb4 NULL,
    CONSTRAINT `PK_ReservationLines` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_ReservationLines_Reservations_ReservationId` FOREIGN KEY (`ReservationId`) REFERENCES `Reservations` (`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_ReservationLines_RoomTypes_RoomTypeId` FOREIGN KEY (`RoomTypeId`) REFERENCES `RoomTypes` (`Id`) ON DELETE RESTRICT,
    CONSTRAINT `FK_ReservationLines_Rooms_RoomId` FOREIGN KEY (`RoomId`) REFERENCES `Rooms` (`Id`) ON DELETE RESTRICT
) CHARACTER SET=utf8mb4;

CREATE INDEX `IX_AspNetRoleClaims_RoleId` ON `AspNetRoleClaims` (`RoleId`);

CREATE UNIQUE INDEX `RoleNameIndex` ON `AspNetRoles` (`NormalizedName`);

CREATE INDEX `IX_AspNetUserClaims_UserId` ON `AspNetUserClaims` (`UserId`);

CREATE INDEX `IX_AspNetUserLogins_UserId` ON `AspNetUserLogins` (`UserId`);

CREATE INDEX `IX_AspNetUserRoles_RoleId` ON `AspNetUserRoles` (`RoleId`);

CREATE INDEX `EmailIndex` ON `AspNetUsers` (`NormalizedEmail`);

CREATE UNIQUE INDEX `UserNameIndex` ON `AspNetUsers` (`NormalizedUserName`);

CREATE UNIQUE INDEX `IX_Branches_Name` ON `Branches` (`Name`);

CREATE UNIQUE INDEX `IX_BranchListings_BranchId_Name` ON `BranchListings` (`BranchId`, `Name`);

CREATE INDEX `IX_Expenses_BranchId` ON `Expenses` (`BranchId`);

CREATE INDEX `IX_Expenses_BusinessDate` ON `Expenses` (`BusinessDate`);

CREATE INDEX `IX_Expenses_Category` ON `Expenses` (`Category`);

CREATE INDEX `IX_Expenses_CurrencyCode` ON `Expenses` (`CurrencyCode`);

CREATE INDEX `IX_ReservationAuditEvents_ActorEmail` ON `ReservationAuditEvents` (`ActorEmail`);

CREATE INDEX `IX_ReservationAuditEvents_OccurredAtUtc` ON `ReservationAuditEvents` (`OccurredAtUtc`);

CREATE INDEX `IX_ReservationAuditEvents_ReservationId` ON `ReservationAuditEvents` (`ReservationId`);

CREATE INDEX `IX_ReservationLines_ReservationId` ON `ReservationLines` (`ReservationId`);

CREATE INDEX `IX_ReservationLines_RoomId` ON `ReservationLines` (`RoomId`);

CREATE INDEX `IX_ReservationLines_RoomTypeId` ON `ReservationLines` (`RoomTypeId`);

CREATE INDEX `IX_Reservations_BookingNumber` ON `Reservations` (`BookingNumber`);

CREATE INDEX `IX_Reservations_BranchId` ON `Reservations` (`BranchId`);

CREATE INDEX `IX_Reservations_CheckInDate_CheckOutDate` ON `Reservations` (`CheckInDate`, `CheckOutDate`);

CREATE INDEX `IX_Reservations_IsDeleted` ON `Reservations` (`IsDeleted`);

CREATE INDEX `IX_Reservations_Source` ON `Reservations` (`Source`);

CREATE INDEX `IX_Reservations_Status` ON `Reservations` (`Status`);

CREATE INDEX `IX_Rooms_BranchId` ON `Rooms` (`BranchId`);

CREATE UNIQUE INDEX `IX_Rooms_BranchId_RoomNumber` ON `Rooms` (`BranchId`, `RoomNumber`);

CREATE INDEX `IX_Rooms_RoomTypeId` ON `Rooms` (`RoomTypeId`);

CREATE INDEX `IX_Rooms_Status` ON `Rooms` (`Status`);

CREATE INDEX `IX_RoomTypes_BranchId` ON `RoomTypes` (`BranchId`);

CREATE UNIQUE INDEX `IX_RoomTypes_BranchId_Name` ON `RoomTypes` (`BranchId`, `Name`);

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260220233406_Initial_MySQL', '9.0.0');

ALTER TABLE `ReservationLines` RENAME INDEX `IX_ReservationLines_RoomId` TO `IX_ResLines_Room`;

ALTER TABLE `Reservations` MODIFY COLUMN `CurrencyCode` int NOT NULL DEFAULT 2;

CREATE INDEX `IX_Res_Branch_Status_Dates` ON `Reservations` (`BranchId`, `Status`, `CheckInDate`);

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260225224231_OptimizeReservationQueries', '9.0.0');

COMMIT;

