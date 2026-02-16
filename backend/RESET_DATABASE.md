# Hotel PMS - Database Reset Guide

**Version:** 2026-01-29  
**Database:** SQLite  
**Connection String:** `Data Source=app.db` (Development)

---

## 📍 Database File Location

**Relative Path:** `src/Web/app.db`  
**Absolute Path:** `C:\Users\Workstation\hotel\backend\src\Web\app.db`  
**Connection String (Development):** `Data Source=app.db` (defined in `src/Web/appsettings.Development.json`)

> ⚠️ **IMPORTANT:** The folder `src/Web/App_Data/Uploads` contains uploaded PDF files and is **NOT** the database. Deleting this folder only removes PDF attachments, not reservation records.

---

## 🗂️ Database Schema Overview

### Tables with Reservation Data
- **`Reservations`** - Main reservation records
- **`ReservationLines`** - Room assignments per reservation (FK to Reservations)
- **`ActivityLogs`** - Audit trail (includes reservation actions)

### Tables to PRESERVE (Room Inventory & Users)
- **`RoomTypes`** - Room type definitions
- **`Rooms`** - Physical room inventory
- **`AspNetUsers`** - User accounts
- **`AspNetRoles`** - User roles
- **`AspNetUserRoles`** - User-role assignments
- **`AspNetUserClaims`**, **`AspNetUserLogins`**, **`AspNetUserTokens`**, **`AspNetRoleClaims`** - Identity framework tables

---

## 🔄 OPTION A: Full Database Reset (Fastest)

**Use when:** You want to reset everything (reservations, rooms, users) to initial seed state.

### From Repository Root

```powershell
# Navigate to backend folder
cd c:\Users\Workstation\hotel\backend

# Drop the database (force, no confirmation)
dotnet ef database drop --force --project src\Infrastructure --startup-project src\Web

# Recreate database with migrations + seed data
dotnet ef database update --project src\Infrastructure --startup-project src\Web
```

### From Backend Folder

```powershell
# If already in c:\Users\Workstation\hotel\backend
dotnet ef database drop --force --project src\Infrastructure --startup-project src\Web
dotnet ef database update --project src\Infrastructure --startup-project src\Web
```

### What This Does
1. **Deletes** `src/Web/app.db` entirely
2. **Recreates** the database from migrations
3. **Runs** seed data initializer (creates default users, room types, rooms, and sample reservations)

### ⚠️ Side Effects
- All users are reset (you'll need to log in with default credentials)
- All room types and rooms are reset to seed data
- All reservations are reset to seed data
- Activity logs are cleared

---

## 🎯 OPTION B: Delete Reservations Only (Preserve Rooms & Users)

**Use when:** You want to keep room inventory and user accounts, but remove all reservation data.

> 💡 **Note:** SQLite CLI (`sqlite3`) is **optional**. If not installed, use the PowerShell script method (Step 2b) or the provided `reset_database.ps1` utility.

### Step 1: Get Table Names (Verification - Optional)

**Method 1: Using SQLite CLI (if installed)**
```powershell
# From backend folder
cd c:\Users\Workstation\hotel\backend\src\Web

# Open SQLite database
sqlite3 app.db

# List all tables
.tables

# Exit SQLite
.exit
```

**Method 2: Using EF Core (no SQLite CLI needed)**
```powershell
# From backend folder
cd c:\Users\Workstation\hotel\backend

# Show DbContext info (includes provider and database location)
dotnet ef dbcontext info --project src\Infrastructure --startup-project src\Web
```

**Expected Tables:**
```
ActivityLogs          AspNetUserLogins      Reservations
AspNetRoleClaims      AspNetUserRoles       ReservationLines
AspNetRoles           AspNetUsers           RoomTypes
AspNetUserClaims      AspNetUserTokens      Rooms
```

### Step 2a: Run SQL Script (Using SQLite CLI)

**If you have SQLite CLI installed:**

Create a file `reset_reservations.sql` in `backend/src/Web/`:

```sql
-- Delete reservation data in correct order (respects FK constraints)

-- 1. Delete child records first (ReservationLines references Reservations)
DELETE FROM ReservationLines;

-- 2. Delete main reservation records
DELETE FROM Reservations;

-- 3. Delete reservation-related activity logs (optional - keeps audit trail clean)
DELETE FROM ActivityLogs WHERE EntityType = 'Reservation';

-- 4. Reset SQLite auto-increment counters (optional - starts IDs from 1 again)
DELETE FROM sqlite_sequence WHERE name IN ('Reservations', 'ReservationLines');

-- Verify deletion
SELECT 'Reservations remaining: ' || COUNT(*) FROM Reservations;
SELECT 'ReservationLines remaining: ' || COUNT(*) FROM ReservationLines;
```

Execute the script:

```powershell
# From backend/src/Web folder
cd c:\Users\Workstation\hotel\backend\src\Web

# Execute the SQL script
sqlite3 app.db < reset_reservations.sql
```

### Step 2b: Use PowerShell Script (No SQLite CLI Required) ⭐ RECOMMENDED

**If you don't have SQLite CLI or prefer an easier method:**

```powershell
# From backend folder
cd c:\Users\Workstation\hotel\backend

# Run the provided PowerShell utility
.\reset_database.ps1 -Mode ReservationsOnly
```

This script:
- ✅ Works without SQLite CLI
- ✅ Prompts for confirmation before deletion
- ✅ Shows verification counts after deletion
- ✅ Handles all FK constraints correctly

### Alternative: Direct SQL Execution (No File)

```powershell
cd c:\Users\Workstation\hotel\backend\src\Web

# Execute SQL directly
sqlite3 app.db "DELETE FROM ReservationLines; DELETE FROM Reservations; DELETE FROM ActivityLogs WHERE EntityType = 'Reservation'; DELETE FROM sqlite_sequence WHERE name IN ('Reservations', 'ReservationLines');"

# Verify
sqlite3 app.db "SELECT COUNT(*) as ReservationCount FROM Reservations;"
```

### What This Preserves
✅ Room types  
✅ Rooms  
✅ Users and roles  
✅ User logins and sessions  

### What This Deletes
❌ All reservations  
❌ All reservation lines  
❌ Reservation activity logs  

---

## 📁 Uploaded PDF Files (Separate from Database)

**Location:** `src/Web/App_Data/Uploads/`

### To Delete Uploaded PDFs

```powershell
# From repository root
Remove-Item -Path "c:\Users\Workstation\hotel\backend\src\Web\App_Data\Uploads\*" -Recurse -Force

# Verify deletion
Get-ChildItem -Path "c:\Users\Workstation\hotel\backend\src\Web\App_Data\Uploads\"
```

### Important Notes
- Deleting PDFs **does NOT** delete reservation records in the database
- Deleting reservation records **does NOT** delete PDF files
- If you delete both, you get a clean slate for the PDF upload workflow

---

## ✅ How to Use - Quick Checklist

### Scenario 1: "I want a completely fresh start"
1. ✅ Run **OPTION A** (Full DB Reset)
2. ✅ Optionally delete uploaded PDFs
3. ✅ Restart the Web API
4. ✅ Log in with default seed credentials

### Scenario 2: "I want to keep rooms and users, just clear reservations"
1. ✅ Run **OPTION B** (SQL Script)
2. ✅ Optionally delete uploaded PDFs
3. ✅ Restart the Web API (or just refresh frontend)

### Scenario 3: "I only want to clear uploaded PDF files"
1. ✅ Delete files from `App_Data/Uploads/`
2. ✅ No database changes needed
3. ✅ No restart needed

---

## 🔍 Verification Commands

### Check Database File Exists
```powershell
Test-Path "c:\Users\Workstation\hotel\backend\src\Web\app.db"
```

### Check Database Size
```powershell
Get-Item "c:\Users\Workstation\hotel\backend\src\Web\app.db" | Select-Object Length, LastWriteTime
```

### Count Reservations
```powershell
cd c:\Users\Workstation\hotel\backend\src\Web
sqlite3 app.db "SELECT COUNT(*) FROM Reservations;"
```

### Count Rooms
```powershell
sqlite3 app.db "SELECT COUNT(*) FROM Rooms;"
```

### Count Users
```powershell
sqlite3 app.db "SELECT COUNT(*) FROM AspNetUsers;"
```

---

## 🛠️ Troubleshooting

### "Database is locked"
**Cause:** Web API is running and has the database open.  
**Solution:** Stop the Web API process, then retry.

### "dotnet ef command not found"
**Cause:** EF Core tools not installed globally.  
**Solution:**
```powershell
dotnet tool install --global dotnet-ef
```

### "No DbContext was found"
**Cause:** Wrong project paths.  
**Solution:** Always use `--project src\Infrastructure --startup-project src\Web` from backend root.

### "Cannot delete database file"
**Cause:** File is in use or locked.  
**Solution:**
1. Stop the Web API
2. Close any SQLite browser tools
3. Retry the command

---

## 📝 Notes

- **Seed Data:** After OPTION A, the database is repopulated by `ApplicationDbContextInitialiser` (runs automatically in Development mode on startup).
- **Migrations:** All migrations in `src/Infrastructure/Data/Migrations/` are applied in order.
- **Connection String:** Production environments may use a different connection string (check `appsettings.json` vs `appsettings.Development.json`).
- **Backup:** If you want to preserve current data, copy `app.db` to a backup location before resetting.

---

**Last Updated:** 2026-01-29  
**Maintained By:** Hotel PMS Development Team
