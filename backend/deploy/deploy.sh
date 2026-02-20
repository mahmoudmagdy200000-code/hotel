#!/bin/bash
set -euo pipefail

echo "============================================="
echo " Hotel PMS Backend Deployment"
echo "============================================="

# 1. Check .NET
echo ">>> [1/8] Checking .NET Runtime..."
/root/.dotnet/dotnet --list-runtimes | grep -i "aspnet" && echo "OK: ASP.NET found" || echo "WARN: ASP.NET not found"

# 2. Install Nginx
echo ">>> [2/8] Nginx..."
command -v nginx >/dev/null 2>&1 && echo "OK: Nginx already installed" || { apt-get update -qq && apt-get install -y -qq nginx; echo "OK: Nginx installed"; }

# 3. Deploy files
echo ">>> [3/8] Deploying application files..."
systemctl stop hotel-backend 2>/dev/null || true
mkdir -p /var/www/hotel-backend
rm -rf /var/www/hotel-backend/*
cp -r /tmp/hotel-publish/* /var/www/hotel-backend/
mkdir -p /var/www/hotel-backend/uploads
echo "OK: Files deployed to /var/www/hotel-backend"

# 4. Permissions
echo ">>> [4/8] Setting permissions..."
chmod -R 755 /var/www/hotel-backend
echo "OK: Permissions set"

# 5. Systemd service (runs as root since dotnet is in /root/.dotnet)
echo ">>> [5/8] Creating systemd service..."
cat > /etc/systemd/system/hotel-backend.service << 'SVCEOF'
[Unit]
Description=Hotel PMS Backend API (.NET 10)
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=notify
WorkingDirectory=/var/www/hotel-backend
ExecStart=/root/.dotnet/dotnet /var/www/hotel-backend/CleanArchitecture.Web.dll
Restart=always
RestartSec=10
SyslogIdentifier=hotel-backend
User=root
Group=root
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://localhost:5000
Environment=DOTNET_ROOT=/root/.dotnet
KillSignal=SIGINT
TimeoutStopSec=90

[Install]
WantedBy=multi-user.target
SVCEOF
systemctl daemon-reload
systemctl enable hotel-backend
echo "OK: Service created"

# 6. Nginx reverse proxy
echo ">>> [6/8] Configuring Nginx..."
cat > /etc/nginx/sites-available/hotel-backend << 'NGXEOF'
server {
    listen 80;
    server_name 136.243.129.84;
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }
}
NGXEOF
ln -sf /etc/nginx/sites-available/hotel-backend /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && echo "OK: Nginx config valid"

# 7. Firewall
echo ">>> [7/8] Firewall..."
if command -v ufw >/dev/null 2>&1; then
    ufw allow 22/tcp >/dev/null 2>&1
    ufw allow 80/tcp >/dev/null 2>&1
    ufw allow 443/tcp >/dev/null 2>&1
    echo "y" | ufw enable >/dev/null 2>&1 || true
    echo "OK: Firewall configured"
else
    echo "SKIP: ufw not found"
fi

# 8. Start services
echo ">>> [8/8] Starting services..."
systemctl restart nginx
systemctl restart hotel-backend
sleep 8

# Verify
echo ""
echo "============================================="
echo " VERIFICATION"
echo "============================================="
echo "Service status:"
systemctl is-active hotel-backend && echo "SERVICE: ACTIVE" || echo "SERVICE: FAILED"
echo ""
echo "Health check:"
curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:5000/health 2>/dev/null || echo "Health check failed"
echo ""
echo "API check:"
curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:5000/api 2>/dev/null || echo "API check failed"
echo ""
echo "Swagger spec check:"
curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:5000/api/specification.json 2>/dev/null || echo "Spec check failed"
echo ""
echo ""
echo "============================================="
echo " DEPLOYMENT COMPLETE"
echo " Swagger: http://136.243.129.84/api"
echo " Health:  http://136.243.129.84/health"
echo "============================================="
