-- ============================================================
-- Hotel PMS - Reset Reservations Only (SQLite)
-- ============================================================
-- Purpose: Delete all reservation data while preserving
--          room inventory, room types, and user accounts
-- ============================================================

-- 1. Delete child records first (ReservationLines references Reservations)
DELETE FROM ReservationLines;

-- 2. Delete main reservation records
DELETE FROM Reservations;

-- 3. Delete reservation-related activity logs (optional - keeps audit trail clean)
DELETE FROM ActivityLogs WHERE EntityType = 'Reservation';

-- 4. Reset SQLite auto-increment counters (optional - starts IDs from 1 again)
DELETE FROM sqlite_sequence WHERE name IN ('Reservations', 'ReservationLines');

-- ============================================================
-- Verification Queries
-- ============================================================

SELECT 'Reservations remaining: ' || COUNT(*) as Status FROM Reservations;
SELECT 'ReservationLines remaining: ' || COUNT(*) as Status FROM ReservationLines;
SELECT 'Rooms preserved: ' || COUNT(*) as Status FROM Rooms;
SELECT 'RoomTypes preserved: ' || COUNT(*) as Status FROM RoomTypes;
SELECT 'Users preserved: ' || COUNT(*) as Status FROM AspNetUsers;

-- ============================================================
-- Expected Output (after successful deletion):
-- ============================================================
-- Reservations remaining: 0
-- ReservationLines remaining: 0
-- Rooms preserved: <number of rooms in your inventory>
-- RoomTypes preserved: <number of room types>
-- Users preserved: <number of users>
-- ============================================================
