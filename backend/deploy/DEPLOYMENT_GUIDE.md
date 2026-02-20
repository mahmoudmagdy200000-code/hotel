# 🚀 Hotel PMS Backend - Deployment Guide

## Server Details
| Item | Value |
|------|-------|
| **Server IP** | `136.243.129.84` |
| **OS** | Ubuntu 24.04 |
| **.NET Runtime** | 10.0.3 at `/root/.dotnet` |
| **Database** | MySQL (`hotel` / `hotel` / `M12345@m`) |
| **App Path** | `/var/www/hotel-backend` |
| **App Port** | `5000` (internal) |
| **Frontend** | `https://hotel-dun-ten.vercel.app` |

---

## Pre-Deployment Checklist

- [x] `appsettings.Production.json` → Connection string key = `CleanArchitectureDb` ✅
- [x] CORS → `https://hotel-dun-ten.vercel.app` added ✅
- [x] `dotnet publish` → Success ✅
- [x] DB migrations → Auto-run via `InitialiseDatabaseAsync()` ✅

---

## Step-by-Step Deployment

### Step 1: Upload Published Files to Server

On your **local Windows machine**, run:

```powershell
# Option A: Using scp (install OpenSSH or use Git Bash)
scp -r "c:\Users\Workstation\hotel\backend\publish\*" root@136.243.129.84:/tmp/hotel-publish/

# Option B: Using WinSCP or FileZilla
# Connect to root@136.243.129.84
# Upload contents of c:\Users\Workstation\hotel\backend\publish\ to /tmp/hotel-publish/
```

### Step 2: Upload and Run the Deploy Script

```powershell
# Upload deploy script
scp "c:\Users\Workstation\hotel\backend\deploy\deploy.sh" root@136.243.129.84:/tmp/deploy.sh

# SSH into server and run
ssh root@136.243.129.84
chmod +x /tmp/deploy.sh
bash /tmp/deploy.sh
```

### Step 3: Verify Deployment

```bash
# Health check
curl http://136.243.129.84/health

# Swagger UI - open in browser
# http://136.243.129.84/api

# Check service status
systemctl status hotel-backend

# View live logs
journalctl -u hotel-backend -f
```

---

## Manual Deployment (Without Script)

If you prefer doing it manually, SSH into the server and run these steps:

### 1. Prepare App Directory
```bash
sudo mkdir -p /var/www/hotel-backend
sudo systemctl stop hotel-backend 2>/dev/null || true
sudo rm -rf /var/www/hotel-backend/*
sudo cp -r /tmp/hotel-publish/* /var/www/hotel-backend/
sudo chown -R www-data:www-data /var/www/hotel-backend
sudo chmod -R 755 /var/www/hotel-backend
sudo mkdir -p /var/www/hotel-backend/uploads
sudo chown www-data:www-data /var/www/hotel-backend/uploads
```

### 2. Create Systemd Service
```bash
sudo cat > /etc/systemd/system/hotel-backend.service << 'EOF'
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
User=www-data
Group=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://localhost:5000
Environment=DOTNET_ROOT=/root/.dotnet
KillSignal=SIGINT
TimeoutStopSec=90

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable hotel-backend
```

### 3. Configure Nginx
```bash
sudo apt-get update && sudo apt-get install -y nginx

sudo cat > /etc/nginx/sites-available/hotel-backend << 'EOF'
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
EOF

sudo ln -sf /etc/nginx/sites-available/hotel-backend /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
```

### 4. Firewall
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### 5. Start Everything
```bash
sudo systemctl restart nginx
sudo systemctl restart hotel-backend
sleep 5
sudo systemctl status hotel-backend
curl http://localhost:5000/health
```

---

## Troubleshooting

### App won't start
```bash
journalctl -u hotel-backend -n 100 --no-pager
```

### Database connection failed
```bash
# Test MySQL connection
mysql -u hotel -p'M12345@m' -h localhost hotel -e "SELECT 1;"

# Check if MySQL is running
systemctl status mysql
```

### CORS errors from frontend
```bash
# Test CORS headers
curl -I -H "Origin: https://hotel-dun-ten.vercel.app" http://136.243.129.84/health
```

### Permission denied
```bash
# Ensure www-data can execute dotnet
sudo chmod +x /root/.dotnet/dotnet
# Or change service to run as root (less secure):
# Edit /etc/systemd/system/hotel-backend.service
# Change User=www-data to User=root
# Change Group=www-data to Group=root
sudo systemctl daemon-reload
sudo systemctl restart hotel-backend
```

### Nginx 502 Bad Gateway
```bash
# Check if the app is actually running
curl http://localhost:5000/health
# If not, check logs
journalctl -u hotel-backend -n 50 --no-pager
```

---

## Update Deployment

To update the backend:

```powershell
# 1. Publish locally
cd c:\Users\Workstation\hotel\backend\src\Web
dotnet publish -c Release -r linux-x64 --self-contained false -o c:\Users\Workstation\hotel\backend\publish

# 2. Upload to server
scp -r "c:\Users\Workstation\hotel\backend\publish\*" root@136.243.129.84:/tmp/hotel-publish/

# 3. SSH and deploy
ssh root@136.243.129.84
sudo systemctl stop hotel-backend
sudo rm -rf /var/www/hotel-backend/*
sudo cp -r /tmp/hotel-publish/* /var/www/hotel-backend/
sudo chown -R www-data:www-data /var/www/hotel-backend
sudo systemctl start hotel-backend
```

---

## Default Login Credentials (Seeded)

| User | Password | Role |
|------|----------|------|
| `administrator@localhost` | `Administrator1!` | Administrator |
| `owner@localhost` | `Owner1!` | Owner |
| `receptionist@localhost` | `Receptionist1!` | Receptionist |
