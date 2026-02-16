
$body = @{ 
    password = "Administrator1!"
} | ConvertTo-Json

[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}

try {
    $res = Invoke-WebRequest -Uri "https://localhost:5001/api/Users/login" -Method Post -Body $body -ContentType "application/json"
    Write-Host "StatusCode: $($res.StatusCode)"
    Write-Host "Body: $($res.Content)"
    $res.Content | Out-File -FilePath response.json
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $respBody = $reader.ReadToEnd()
        Write-Host "Response Body: $respBody"
    }
}
