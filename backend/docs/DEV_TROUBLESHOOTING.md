# Developer Troubleshooting Guide

## Hosting & Port Conflicts
If you see an error like `Address already in use` or `Failed to bind to address https://127.0.0.1:5001`, it means another process is using that port.

### PowerShell - Find and Kill the process
```powershell
# Find the Process ID (PID) using port 5001
netstat -ano | findstr :5001

# Kill the process (replace <PID> with the actual number from the previous command)
taskkill /PID <PID> /F
```

### Alternative: Use Different Ports
You can override the ports without editing files:
```bash
dotnet run --project src\Web --urls "https://127.0.0.1:5003;http://127.0.0.1:5002"
```

Alternatively, use the `Web_AltPorts` profile in your IDE or via:
```bash
dotnet run --project src\Web --launch-profile Web_AltPorts
```

---

## HTTPS Certificate Issues
If you see warnings about the dev certificate not being trusted:

```bash
# Clean existing certificates
dotnet dev-certs https --clean

# Trust the development certificate
dotnet dev-certs https --trust
```

**Note:** This is a warning only. It is safe to ignore in development if you are using the HTTP profile (`http://localhost:5000`).
