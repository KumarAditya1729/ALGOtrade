#!/bin/bash
# CalculatedRisk Deployment Script for Ubuntu VPS
# This script installs Docker, Nginx, Certbot, and starts the Docker Compose stack.

set -e

# 1. Update system and install dependencies
echo "Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl wget git nginx certbot python3-certbot-nginx software-properties-common apt-transport-https ca-certificates ufw

# 2. Install Docker & Docker Compose
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
else
    echo "Docker is already installed."
fi

# 3. Configure Firewall
echo "Configuring UFW Firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# 4. Build and Start Docker Containers
echo "Building and starting Docker Compose stack..."
# Ensure we are in the directory with docker-compose.yml
if [ ! -f "docker-compose.yml" ]; then
    echo "Error: docker-compose.yml not found in the current directory."
    echo "Please navigate to the CalculatedRisk project root before running this script."
    exit 1
fi

sudo docker compose up -d --build

# 5. Nginx Configuration
DOMAIN=""
read -p "Enter your domain name (e.g. calculatedrisk.com) or leave blank to skip SSL: " DOMAIN

if [ -n "$DOMAIN" ]; then
    echo "Configuring Nginx reverse proxy for $DOMAIN..."
    
    cat <<EOF | sudo tee /etc/nginx/sites-available/calculatedrisk
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://localhost:8888;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

    sudo ln -sf /etc/nginx/sites-available/calculatedrisk /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t
    sudo systemctl restart nginx

    # 6. SSL Configuration
    echo "Obtaining SSL certificate via Let's Encrypt..."
    sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN || echo "Certbot failed, please check your DNS records."

    echo "============================================="
    echo "Deployment Complete!"
    echo "Your application should now be accessible at https://$DOMAIN"
    echo "============================================="
else
    echo "============================================="
    echo "Deployment Complete!"
    echo "Your application is running via Docker Compose."
    echo "Since no domain was provided, you will need to access it via your server IP."
    echo "============================================="
fi
