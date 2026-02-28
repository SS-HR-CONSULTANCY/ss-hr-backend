#!/bin/bash

# SS HR Consultancy - GCP Setup Script
# This script sets up the GCP instance for deployment

set -e

echo "🚀 Starting GCP setup for SS HR Consultancy..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js (using NodeSource repository for latest LTS)
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install Nginx
echo "📦 Installing Nginx..."
sudo apt install -y nginx

# Install Git (if not already installed)
echo "📦 Installing Git..."
sudo apt install -y git

# Install build tools
echo "📦 Installing build tools..."
sudo apt install -y build-essential

# Create application directory
echo "📁 Creating application directories..."
sudo mkdir -p /var/www/ss-hr-consultancy/{frontend,backend,logs}
sudo chown -R $USER:$USER /var/www/ss-hr-consultancy

# Create PM2 startup script
echo "⚙️  Setting up PM2 startup..."
pm2 startup systemd -u $USER --hp /home/$USER
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER

# Install Certbot for SSL (optional, uncomment if needed)
# echo "📦 Installing Certbot..."
# sudo apt install -y certbot python3-certbot-nginx

echo "✅ GCP setup completed!"
echo ""
echo "Next steps:"
echo "1. Clone your repository to /var/www/ss-hr-consultancy"
echo "2. Run ./deployment/scripts/deploy.sh to deploy the application"
echo "3. Configure your domain in nginx configuration"
echo "4. Set up SSL with Certbot (optional)"

