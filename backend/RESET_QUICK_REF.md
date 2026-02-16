# Database Reset - Quick Reference

## 📍 Key Information

**Database File:** `c:\Users\Workstation\hotel\backend\src\Web\app.db`  
**Connection String:** `Data Source=app.db` (from `appsettings.Development.json`)  
**Uploads Folder:** `c:\Users\Workstation\hotel\backend\src\Web\App_Data\Uploads\` (PDFs only, NOT the database)

---

## ⚡ Quick Commands

### Option A: Full Reset (Everything)
```powershell
cd c:\Users\Workstation\hotel\backend
dotnet ef database drop --force --project src\Infrastructure --startup-project src\Web
dotnet ef database update --project src\Infrastructure --startup-project src\Web
```

### Option B: Delete Reservations Only (Recommended)
```powershell
cd c:\Users\Workstation\hotel\backend
.\reset_database.ps1 -Mode ReservationsOnly
```

### Verify Database State
```powershell
cd c:\Users\Workstation\hotel\backend
.\reset_database.ps1
# (default mode is VerifyOnly - safe, no changes)
```

---

## 📊 What Gets Deleted

| Option | Reservations | Rooms | Users | Room Types |
|--------|--------------|-------|-------|------------|
| **A: Full Reset** | ✅ Deleted | ✅ Deleted | ✅ Deleted | ✅ Deleted |
| **B: Reservations Only** | ✅ Deleted | ❌ Preserved | ❌ Preserved | ❌ Preserved |

---

## 🔧 Troubleshooting

**"Database is locked"**  
→ Stop the Web API first

**"dotnet ef command not found"**  
→ Run: `dotnet tool install --global dotnet-ef`

**"Cannot delete database file"**  
→ Close all programs using the database (API, SQLite browsers)

---

## 📖 Full Documentation

See `RESET_DATABASE.md` for complete details, SQL scripts, and advanced options.
