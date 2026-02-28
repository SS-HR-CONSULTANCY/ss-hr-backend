#!/bin/bash

# SS HR Consultancy - Deployment Script
# This script deploys both frontend and backend to GCP

set -e

APP_DIR="/var/www/ss-hr-consultancy"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
LOG_DIR="$APP_DIR/logs"

echo "🚀 Starting deployment..."

# Check if directories exist
if [ ! -d "$BACKEND_DIR" ] || [ ! -d "$FRONTEND_DIR" ]; then
    echo "❌ Error: Backend or Frontend directory not found!"
    echo "Please ensure the repository is cloned to $APP_DIR"
    exit 1
fi

# Deploy Backend
echo "📦 Deploying Backend..."
cd $BACKEND_DIR

# Install dependencies
echo "Installing backend dependencies..."
npm ci --production=false

# Build backend
echo "Building backend..."
npm run build

# Copy environment file (if exists)
if [ -f ".env.example" ] && [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Please create it from .env.example"
fi

# Restart backend with PM2
echo "Restarting backend with PM2..."
if [ -f "ecosystem.config.js" ]; then
    pm2 restart ecosystem.config.js --update-env || pm2 start ecosystem.config.js
else
    # Copy PM2 config if not exists
    cp ../../deployment/pm2/ecosystem.config.js ecosystem.config.js
    pm2 restart ecosystem.config.js --update-env || pm2 start ecosystem.config.js
fi

# Save PM2 configuration
pm2 save

# Deploy Frontend
echo "📦 Deploying Frontend..."
cd $FRONTEND_DIR

# Install dependencies
echo "Installing frontend dependencies..."
npm ci

# Build frontend
echo "Building frontend..."
npm run build

# Copy built files to nginx directory
echo "Copying frontend build to nginx directory..."
sudo cp -r dist/* /var/www/ss-hr-consultancy/frontend/dist/

# Set proper permissions
sudo chown -R www-data:www-data /var/www/ss-hr-consultancy/frontend/dist

# Reload Nginx
echo "Reloading Nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Deployment completed successfully!"
echo ""
echo "Backend is running on: http://localhost:5000"
echo "Frontend is served by Nginx"
echo ""
echo "Check PM2 status: pm2 status"
echo "Check PM2 logs: pm2 logs ss-hr-backend"
echo "Check Nginx logs: sudo tail -f /var/log/nginx/error.log"

