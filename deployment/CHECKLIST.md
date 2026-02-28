# ✅ Deployment Checklist

Use this checklist to ensure a smooth deployment.

## Pre-Deployment

- [ ] GCE instance created and running
- [ ] Security group configured (ports 22, 80, 443)
- [ ] Domain name purchased (optional)
- [ ] Domain DNS configured to point to GCE IP
- [ ] MongoDB database created and accessible
- [ ] Google Cloud Storage (GCS) bucket created (if using S3)
- [ ] Redis instance ready (if using Redis)
- [ ] SSH key pair ready
- [ ] All environment variables documented

## Environment Variables Checklist

### Backend (.env)
- [ ] `PORT=5000`
- [ ] `NODE_ENV=production`
- [ ] `MONGODB_URI=your-mongodb-connection-string`
- [ ] `JWT_SECRET=strong-random-secret`
- [ ] `JWT_EXPIRES_IN=7d` (or your preferred expiry)
- [ ] `SESSION_SECRET=strong-random-secret`
- [ ] `FRONTEND_PRODUCTION_URL=https://your-domain.com`
- [ ] `FRONTEND_PRODUCTION_URL_TWO=https://www.your-domain.com`
- [ ] `ADMIN_EMAIL=your-admin-email@example.com`
- [ ] Google Cloud Storage (GCS) credentials (if using):
  - [ ] `GCP_ACCESS_KEY_ID`
  - [ ] `GCP_SECRET_ACCESS_KEY`
  - [ ] `GCP_REGION`
  - [ ] `GCP_S3_BUCKET_NAME`
- [ ] Redis credentials (if using):
  - [ ] `UPSTASH_REDIS_REST_URL`
  - [ ] `UPSTASH_REDIS_REST_TOKEN`
- [ ] Email service credentials (if using):
  - [ ] `EMAIL_HOST`
  - [ ] `EMAIL_PORT`
  - [ ] `EMAIL_USER`
  - [ ] `EMAIL_PASS`
- [ ] Google OAuth credentials (if using):
  - [ ] `GOOGLE_CLIENT_ID`
  - [ ] `GOOGLE_CLIENT_SECRET`

## Deployment Steps

- [ ] Step 1: SSH into GCE instance
- [ ] Step 2: Run `setup-GCE.sh` script
- [ ] Step 3: Clone repository to `/var/www/ss-hr-consultancy`
- [ ] Step 4: Create backend `.env` file with all variables
- [ ] Step 5: Configure Nginx (update domain name)
- [ ] Step 6: Run `deploy.sh` script
- [ ] Step 7: Verify backend is running (`pm2 status`)
- [ ] Step 8: Verify frontend is accessible
- [ ] Step 9: Test API endpoints
- [ ] Step 10: Setup SSL certificate (optional)

## Post-Deployment Verification

### Backend
- [ ] PM2 shows backend as "online"
- [ ] Backend logs show no errors
- [ ] Database connection successful
- [ ] API endpoints responding
- [ ] Socket.io connections working (if applicable)

### Frontend
- [ ] Frontend loads in browser
- [ ] No console errors
- [ ] API calls working
- [ ] Static assets loading (images, CSS, JS)
- [ ] Routes working correctly

### Nginx
- [ ] Nginx status is "active (running)"
- [ ] No errors in Nginx logs
- [ ] Frontend accessible via domain
- [ ] API proxy working
- [ ] SSL certificate installed (if using HTTPS)

### Security
- [ ] Firewall configured (UFW)
- [ ] Only necessary ports open
- [ ] SSL certificate installed
- [ ] Environment variables secured
- [ ] `.env` file not in repository

## Monitoring Setup

- [ ] PM2 monitoring configured
- [ ] Log rotation set up
- [ ] Backup strategy in place
- [ ] Alerting configured (optional)
- [ ] Health check endpoint working

## Documentation

- [ ] Deployment process documented
- [ ] Environment variables documented
- [ ] Troubleshooting guide available
- [ ] Team members have access

## Maintenance

- [ ] Regular backup schedule set
- [ ] Update strategy defined
- [ ] Monitoring alerts configured
- [ ] Log retention policy set

---

**Notes:**
- Keep this checklist updated as you deploy
- Document any issues encountered
- Update scripts if needed based on your setup

