# 🚀 Quick Start Guide - GCE Deployment

## Prerequisites Checklist
- [ ] GCE instance running Ubuntu 20.04+
- [ ] Domain name (optional but recommended)
- [ ] MongoDB connection string
- [ ] Environment variables ready
- [ ] SSH access to GCE

## Step-by-Step Deployment

### 1. Connect to GCE
```bash
ssh -i your-key.pem ubuntu@your-GCE-ip
```

### 2. Clone Repository
```bash
sudo mkdir -p /var/www/ss-hr-consultancy
sudo chown $USER:$USER /var/www/ss-hr-consultancy
cd /var/www/ss-hr-consultancy
git clone your-repo-url .
```

### 3. Run Setup Script
```bash
chmod +x deployment/scripts/setup-GCE.sh
./deployment/scripts/setup-GCE.sh
```

### 4. Configure Environment
```bash
# Backend
cd backend
cp .env.example .env
nano .env  # Add your environment variables

# Required variables:
# - PORT=5000
# - NODE_ENV=production
# - MONGODB_URI=your-mongodb-uri
# - JWT_SECRET=your-secret
# - FRONTEND_PRODUCTION_URL=https://your-domain.com
```

### 5. Configure Nginx
```bash
# Copy config
sudo cp deployment/nginx/ss-hr-consultancy.conf /etc/nginx/sites-available/ss-hr-consultancy

# Edit domain name
sudo nano /etc/nginx/sites-available/ss-hr-consultancy
# Replace "your-domain.com" with your actual domain

# Enable site
sudo ln -s /etc/nginx/sites-available/ss-hr-consultancy /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Deploy Application
```bash
chmod +x deployment/scripts/deploy.sh
./deployment/scripts/deploy.sh
```

### 7. Setup SSL (Optional)
```bash
chmod +x deployment/scripts/setup-ssl.sh
./deployment/scripts/setup-ssl.sh your-domain.com your-email@example.com
```

## Verify Deployment

### Check Backend
```bash
pm2 status
pm2 logs ss-hr-backend
curl http://localhost:5000/health
```

### Check Frontend
```bash
curl http://localhost
# Or visit your domain in browser
```

### Check Nginx
```bash
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

## Common Commands

```bash
# Update backend only
./deployment/scripts/update-backend.sh

# Update frontend only
./deployment/scripts/update-frontend.sh

# Update both
./deployment/scripts/deploy.sh

# View backend logs
pm2 logs ss-hr-backend

# Restart backend
pm2 restart ss-hr-backend

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

## Troubleshooting

**Backend not starting?**
```bash
pm2 logs ss-hr-backend
# Check .env file exists and has correct values
```

**Frontend not loading?**
```bash
sudo nginx -t
ls -la /var/www/ss-hr-consultancy/frontend/dist/
```

**API requests failing?**
```bash
# Check if backend is running
pm2 status

# Check backend logs
pm2 logs ss-hr-backend

# Test backend directly
curl http://localhost:5000/api/health
```

## File Locations

- **Backend**: `/var/www/ss-hr-consultancy/backend`
- **Frontend**: `/var/www/ss-hr-consultancy/frontend`
- **Nginx Config**: `/etc/nginx/sites-available/ss-hr-consultancy`
- **Logs**: `/var/www/ss-hr-consultancy/logs`
- **PM2 Config**: `/var/www/ss-hr-consultancy/backend/ecosystem.config.js`

## Next Steps

1. Set up automated backups
2. Configure monitoring (optional)
3. Set up CI/CD pipeline (optional)
4. Configure firewall rules
5. Set up log rotation

---

For detailed information, see [README.md](./README.md)

