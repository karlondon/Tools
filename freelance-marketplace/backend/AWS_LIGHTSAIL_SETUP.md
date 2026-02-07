# AWS Lightsail Deployment Guide - FreelanceConnect

## Prerequisites
- AWS Account
- Domain name (optional but recommended)
- Stripe account for payments
- Email account for SMTP

## Part 1: Create Lightsail Resources

### Step 1: Create Database Instance
1. Log into AWS Lightsail Console
2. Click "Databases" → "Create database"
3. Select **PostgreSQL** (latest version)
4. Choose plan: **Standard - $15/month** (1GB RAM, 40GB SSD)
5. Database name: `freelanceconnect-db`
6. Master username: `dbadmin`
7. Master password: (save this securely)
8. Click "Create database"
9. Wait 5-10 minutes for creation
10. Note the endpoint URL (e.g., `ls-xxx.us-east-1.rds.amazonaws.com`)

### Step 2: Create Compute Instance
1. Click "Instances" → "Create instance"
2. Select **Linux/Unix** → **OS Only** → **Ubuntu 20.04 LTS**
3. Choose plan: **$10/month** (1GB RAM, 40GB SSD)
4. Name: `freelanceconnect-server`
5. Click "Create instance"
6. Wait 2-3 minutes for creation

### Step 3: Configure Networking
1. Go to your instance → "Networking" tab
2. Add firewall rules:
   - HTTP (Port 80) - Allow all
   - HTTPS (Port 443) - Allow all
   - Custom (Port 3000) - Allow all (for API)
3. Note your instance's **Static IP**

### Step 4: Attach Static IP (Optional but Recommended)
1. Go to "Networking" → "Create static IP"
2. Attach to your instance
3. Name it: `freelanceconnect-ip`

## Part 2: Setup Server Environment

### Step 5: Connect to Your Instance
```bash
# Download SSH key from Lightsail console
# Connect via terminal
ssh -i LightsailDefaultKey-us-east-1.pem ubuntu@YOUR_STATIC_IP
```

### Step 6: Install Node.js & Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL client
sudo apt-get install -y postgresql-client

# Install Nginx
sudo apt-get install -y nginx

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Git
sudo apt-get install -y git

# Verify installations
node --version  # Should show v18.x
npm --version
psql --version
nginx -v
```

### Step 7: Setup Application Directory
```bash
# Create app directory
cd /home/ubuntu
mkdir freelanceconnect
cd freelanceconnect

# Clone or upload your code
# Option A: Via Git
git clone YOUR_REPO_URL .

# Option B: Upload via SFTP (use FileZilla or similar)
# Upload the freelance-marketplace folder
```

### Step 8: Configure Environment Variables
```bash
cd /home/ubuntu/freelanceconnect/backend

# Copy example env file
cp .env.example .env

# Edit with nano or vim
nano .env

# Fill in these values:
# DB_HOST=your-lightsail-db-endpoint.rds.amazonaws.com
# DB_NAME=postgres
# DB_USER=dbadmin
# DB_PASSWORD=your-db-password
# JWT_SECRET=$(openssl rand -base64 32)
# STRIPE_SECRET_KEY=your_stripe_key
# EMAIL_USER=your_email@gmail.com
# EMAIL_PASSWORD=your_app_password

# Save and exit (Ctrl+X, Y, Enter in nano)
```

### Step 9: Install Application Dependencies
```bash
cd /home/ubuntu/freelanceconnect/backend
npm install
```

## Part 3: Setup Database

### Step 10: Initialize Database Schema
```bash
# Connect to database
psql -h YOUR_DB_ENDPOINT -U dbadmin -d postgres

# Create database
CREATE DATABASE freelanceconnect;

# Connect to it
\c freelanceconnect

# Run schema file
\i /home/ubuntu/freelanceconnect/backend/database/schema.sql

# Verify tables created
\dt

# Exit
\q
```

## Part 4: Configure Nginx

### Step 11: Setup Nginx Reverse Proxy
```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/freelanceconnect

# Paste this configuration:
```

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    # Frontend
    location / {
        root /home/ubuntu/freelanceconnect;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket for messaging
    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/freelanceconnect /etc/nginx/sites-enabled/

# Remove default
sudo rm /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## Part 5: Start Application

### Step 12: Start Backend with PM2
```bash
cd /home/ubuntu/freelanceconnect/backend

# Start application
pm2 start server.js --name freelanceconnect-api

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd
# Run the command it outputs

# Check status
pm2 status
pm2 logs freelanceconnect-api
```

### Step 13: Test Your Application
```bash
# Test backend
curl http://localhost:3000/api/health

# Test from outside
curl http://YOUR_STATIC_IP/api/health
```

## Part 6: Setup SSL (HTTPS)

### Step 14: Install Certbot & Get SSL Certificate
```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificate (requires domain name)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## Part 7: Domain Configuration

### Step 15: Point Domain to Lightsail
1. Go to your domain registrar (GoDaddy, Namecheap, etc.)
2. Add DNS records:
   - **A Record**: @ → YOUR_STATIC_IP
   - **A Record**: www → YOUR_STATIC_IP
3. Wait 5-60 minutes for DNS propagation

## Part 8: Monitoring & Maintenance

### Common PM2 Commands
```bash
pm2 status                    # Check app status
pm2 logs freelanceconnect-api # View logs
pm2 restart freelanceconnect-api # Restart app
pm2 stop freelanceconnect-api # Stop app
pm2 delete freelanceconnect-api # Remove from PM2
```

### Database Backups
```bash
# Manual backup
pg_dump -h YOUR_DB_ENDPOINT -U dbadmin freelanceconnect > backup.sql

# Restore
psql -h YOUR_DB_ENDPOINT -U dbadmin freelanceconnect < backup.sql
```

### Update Application Code
```bash
cd /home/ubuntu/freelanceconnect
git pull origin main
cd backend
npm install
pm2 restart freelanceconnect-api
```

## Cost Summary

**Monthly Costs:**
- Lightsail Instance ($10/month - 1GB RAM)
- Lightsail Database ($15/month - 1GB RAM)
- **Total: $25/month**

**One-time Costs:**
- Domain Name: $10-15/year
- SSL Certificate: Free (Let's Encrypt)

## Troubleshooting

### App won't start
```bash
pm2 logs freelanceconnect-api
# Check for errors in logs
```

### Database connection fails
```bash
# Test connection
psql -h YOUR_DB_ENDPOINT -U dbadmin -d freelanceconnect
# Verify .env DB settings
```

### Nginx errors
```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

### Can't access website
```bash
# Check firewall
sudo ufw status
# Check Nginx
sudo systemctl status nginx
# Check PM2
pm2 status
```

## Security Checklist
- [ ] Change default database password
- [ ] Setup SSL certificate
- [ ] Configure firewall rules
- [ ] Use strong JWT secret
- [ ] Enable database encryption
- [ ] Setup automated backups
- [ ] Configure rate limiting
- [ ] Enable CloudWatch monitoring

## Next Steps After Deployment
1. Test all features thoroughly
2. Setup automated backups
3. Configure email notifications
4. Add monitoring/alerts
5. Setup CDN for static assets (optional)
6. Configure auto-scaling (optional)

---

**Support:** If you encounter issues, check PM2 logs first, then Nginx logs.
