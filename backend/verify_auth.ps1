$ErrorActionPreference = "Stop"
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}

Write-Host "1. Testing Login..." -ForegroundColor Cyan
$loginBody = @{
    email = "administrator@localhost"
    password = "Administrator1!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "https://localhost:5001/api/Users/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.accessToken
    Write-Host "SUCCESS: Login successful. Token obtained." -ForegroundColor Green
} catch {
    Write-Host "FAILED: Login failed." -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

Write-Host "`n2. Testing Protected Endpoint (Reception Today)..." -ForegroundColor Cyan
$todayDate = Get-Date -Format "yyyy-MM-dd"
$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    $receptionResponse = Invoke-RestMethod -Uri "https://localhost:5001/api/Reception/today?date=$todayDate" -Method Get -Headers $headers
    Write-Host "SUCCESS: Protected endpoint returned status $($receptionResponse.date)" -ForegroundColor Green
    Write-Host ($receptionResponse | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "FAILED: Accessing protected endpoint failed." -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}
