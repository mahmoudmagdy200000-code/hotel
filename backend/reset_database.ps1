# ============================================================
# Hotel PMS - Quick Database Reset Script
# ============================================================
# Usage: Run this script from the backend folder
# ============================================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("Full", "ReservationsOnly", "VerifyOnly")]
    [string]$Mode = "VerifyOnly"
)

$BackendRoot = "c:\Users\Workstation\hotel\backend"
$WebProject = "$BackendRoot\src\Web"
$DbFile = "$WebProject\app.db"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Hotel PMS - Database Reset Utility" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check if database exists
if (Test-Path $DbFile) {
    $dbInfo = Get-Item $DbFile
    Write-Host "✓ Database found: $DbFile" -ForegroundColor Green
    Write-Host "  Size: $($dbInfo.Length) bytes" -ForegroundColor Gray
    Write-Host "  Last Modified: $($dbInfo.LastWriteTime)" -ForegroundColor Gray
} else {
    Write-Host "✗ Database not found: $DbFile" -ForegroundColor Red
    Write-Host "  Run 'dotnet ef database update' to create it." -ForegroundColor Yellow
    exit 1
}

Write-Host ""

switch ($Mode) {
    "Full" {
        Write-Host "MODE: Full Database Reset" -ForegroundColor Yellow
        Write-Host "This will DELETE the entire database and recreate it from migrations." -ForegroundColor Yellow
        Write-Host ""
        
        $confirm = Read-Host "Are you sure? Type 'YES' to confirm"
        if ($confirm -ne "YES") {
            Write-Host "Aborted." -ForegroundColor Red
            exit 0
        }
        
        Write-Host ""
        Write-Host "Dropping database..." -ForegroundColor Cyan
        Set-Location $BackendRoot
        dotnet ef database drop --force --project src\Infrastructure --startup-project src\Web
        
        Write-Host "Recreating database..." -ForegroundColor Cyan
        dotnet ef database update --project src\Infrastructure --startup-project src\Web
        
        Write-Host ""
        Write-Host "✓ Database reset complete!" -ForegroundColor Green
    }
    
    "ReservationsOnly" {
        Write-Host "MODE: Delete Reservations Only" -ForegroundColor Yellow
        Write-Host "This will DELETE all reservations but preserve rooms, room types, and users." -ForegroundColor Yellow
        Write-Host ""
        
        $confirm = Read-Host "Are you sure? Type 'YES' to confirm"
        if ($confirm -ne "YES") {
            Write-Host "Aborted." -ForegroundColor Red
            exit 0
        }
        
        Write-Host ""
        Write-Host "Deleting reservations..." -ForegroundColor Cyan
        Set-Location $WebProject
        
        # Use .NET SQLite library (no sqlite3 CLI required)
        try {
            # Load SQLite assembly from NuGet packages (EF Core uses it)
            Add-Type -Path "$BackendRoot\src\Infrastructure\bin\Debug\net9.0\Microsoft.Data.Sqlite.dll" -ErrorAction Stop
            
            $connectionString = "Data Source=$DbFile"
            $connection = New-Object Microsoft.Data.Sqlite.SqliteConnection($connectionString)
            $connection.Open()
            
            # Execute deletion commands
            $commands = @(
                "DELETE FROM ReservationLines;",
                "DELETE FROM Reservations;",
                "DELETE FROM ActivityLogs WHERE EntityType = 'Reservation';",
                "DELETE FROM sqlite_sequence WHERE name IN ('Reservations', 'ReservationLines');"
            )
            
            foreach ($sql in $commands) {
                $command = $connection.CreateCommand()
                $command.CommandText = $sql
                $rowsAffected = $command.ExecuteNonQuery()
                Write-Host "  Executed: $sql" -ForegroundColor Gray
            }
            
            # Verify deletion
            $verifyCommand = $connection.CreateCommand()
            $verifyCommand.CommandText = "SELECT COUNT(*) FROM Reservations;"
            $reservationCount = $verifyCommand.ExecuteScalar()
            
            $connection.Close()
            
            Write-Host ""
            Write-Host "✓ Reservations deleted!" -ForegroundColor Green
            Write-Host "  Remaining reservations: $reservationCount" -ForegroundColor $(if ($reservationCount -eq 0) { "Green" } else { "Red" })
            
        } catch {
            Write-Host "✗ Error accessing database directly." -ForegroundColor Red
            Write-Host "  Falling back to EF Core migration method..." -ForegroundColor Yellow
            Write-Host ""
            
            # Fallback: Use a temporary migration approach
            Write-Host "  Creating temporary SQL file..." -ForegroundColor Gray
            $tempSql = @"
DELETE FROM ReservationLines;
DELETE FROM Reservations;
DELETE FROM ActivityLogs WHERE EntityType = 'Reservation';
DELETE FROM sqlite_sequence WHERE name IN ('Reservations', 'ReservationLines');
"@
            $tempSqlFile = "$WebProject\temp_delete_reservations.sql"
            $tempSql | Out-File -FilePath $tempSqlFile -Encoding UTF8
            
            Write-Host "  SQL file created: $tempSqlFile" -ForegroundColor Gray
            Write-Host ""
            Write-Host "  To complete deletion, run ONE of these commands:" -ForegroundColor Yellow
            Write-Host "    1. sqlite3 app.db < temp_delete_reservations.sql" -ForegroundColor Cyan
            Write-Host "    2. Use a SQLite GUI tool (DB Browser for SQLite) to execute the SQL" -ForegroundColor Cyan
            Write-Host "    3. Use OPTION A (Full Reset) instead" -ForegroundColor Cyan
        }
    }
    
    "VerifyOnly" {
        Write-Host "MODE: Verification Only (No Changes)" -ForegroundColor Cyan
        Write-Host ""
        
        Set-Location $WebProject
        
        Write-Host "Counting records..." -ForegroundColor Gray
        Write-Host ""
        
        try {
            # Try to use .NET SQLite library
            Add-Type -Path "$BackendRoot\src\Infrastructure\bin\Debug\net9.0\Microsoft.Data.Sqlite.dll" -ErrorAction Stop
            
            $connectionString = "Data Source=$DbFile"
            $connection = New-Object Microsoft.Data.Sqlite.SqliteConnection($connectionString)
            $connection.Open()
            
            # Query counts
            $queries = @{
                "Reservations" = "SELECT COUNT(*) FROM Reservations;"
                "ReservationLines" = "SELECT COUNT(*) FROM ReservationLines;"
                "Rooms" = "SELECT COUNT(*) FROM Rooms;"
                "RoomTypes" = "SELECT COUNT(*) FROM RoomTypes;"
                "Users" = "SELECT COUNT(*) FROM AspNetUsers;"
            }
            
            $counts = @{}
            foreach ($table in $queries.Keys) {
                $command = $connection.CreateCommand()
                $command.CommandText = $queries[$table]
                $counts[$table] = $command.ExecuteScalar()
            }
            
            $connection.Close()
            
            Write-Host "  Reservations:      $($counts['Reservations'])" -ForegroundColor $(if ($counts['Reservations'] -eq 0) { "Green" } else { "Yellow" })
            Write-Host "  ReservationLines:  $($counts['ReservationLines'])" -ForegroundColor $(if ($counts['ReservationLines'] -eq 0) { "Green" } else { "Yellow" })
            Write-Host "  Rooms:             $($counts['Rooms'])" -ForegroundColor Cyan
            Write-Host "  RoomTypes:         $($counts['RoomTypes'])" -ForegroundColor Cyan
            Write-Host "  Users:             $($counts['Users'])" -ForegroundColor Cyan
            
        } catch {
            Write-Host "  ⚠ Could not load SQLite library directly." -ForegroundColor Yellow
            Write-Host "  Database file exists but requires SQLite CLI or GUI tool for verification." -ForegroundColor Gray
            Write-Host ""
            Write-Host "  Alternative verification methods:" -ForegroundColor Gray
            Write-Host "    1. Install SQLite CLI and run: sqlite3 app.db 'SELECT COUNT(*) FROM Reservations;'" -ForegroundColor Cyan
            Write-Host "    2. Use DB Browser for SQLite (https://sqlitebrowser.org/)" -ForegroundColor Cyan
            Write-Host "    3. Run the Web API and check via Swagger UI" -ForegroundColor Cyan
        }
        
        Write-Host ""
        Write-Host "To reset, run this script with -Mode parameter:" -ForegroundColor Gray
        Write-Host "  .\reset_database.ps1 -Mode Full" -ForegroundColor Gray
        Write-Host "  .\reset_database.ps1 -Mode ReservationsOnly" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
