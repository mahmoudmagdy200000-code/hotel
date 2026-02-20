#!/bin/bash
# Diagnostic + Fix script
set -e

echo "=== DIAGNOSTICS ==="

# Check dotnet location
echo "--- dotnet binary ---"
which dotnet 2>/dev/null || true
ls -la /root/.dotnet/dotnet 2>/dev/null || true
ls -la /usr/bin/dotnet 2>/dev/null || true
ls -la /usr/local/bin/dotnet 2>/dev/null || true
find / -name "dotnet" -type f 2>/dev/null | head -5

echo "--- dotnet info ---"
export DOTNET_ROOT=/root/.dotnet
export PATH=$DOTNET_ROOT:$PATH
dotnet --info 2>&1 | head -30

echo "--- deployed files ---"
ls /var/www/hotel-backend/*.dll 2>/dev/null | head -10

echo "--- fix service ---"
# Try using full path with DOTNET_ROOT set
cat > /etc/systemd/system/hotel-backend.service << 'SVCEOF'
[Unit]
Description=Hotel PMS Backend API (.NET 10)
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=exec
WorkingDirectory=/var/www/hotel-backend
ExecStart=/root/.dotnet/dotnet CleanArchitecture.Web.dll
Restart=always
RestartSec=10
SyslogIdentifier=hotel-backend
User=root
Group=root
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://localhost:5000
Environment=DOTNET_ROOT=/root/.dotnet
Environment=PATH=/root/.dotnet:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
KillSignal=SIGINT
TimeoutStopSec=90

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl restart hotel-backend
sleep 5

echo "--- service status ---"
systemctl status hotel-backend --no-pager 2>&1 | head -30

echo "--- latest logs ---"
journalctl -u hotel-backend -n 30 --no-pager 2>&1

echo "--- health check ---"
curl -s -o /dev/null -w "HTTP_CODE:%{http_code}" http://localhost:5000/health 2>/dev/null || echo "HEALTH_FAILED"

echo ""
echo "=== DONE ==="
