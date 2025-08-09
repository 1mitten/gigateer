# Deployment Guide

This guide covers deploying Gigateer to production environments, including cloud platforms, VPS servers, and containerized deployments.

## Table of Contents

- [Production Requirements](#production-requirements)
- [Environment Configuration](#environment-configuration)
- [Deployment Options](#deployment-options)
- [Cloud Platform Deployments](#cloud-platform-deployments)
- [VPS/Self-Hosted Deployment](#vpsself-hosted-deployment)
- [Docker Deployment](#docker-deployment)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Scaling Considerations](#scaling-considerations)
- [Security Checklist](#security-checklist)
- [Troubleshooting](#troubleshooting)

## Production Requirements

### System Requirements

**Minimum Requirements:**
- **CPU**: 1 vCPU
- **RAM**: 512MB (1GB recommended)
- **Storage**: 1GB (5GB recommended for logs and data)
- **Network**: Stable internet connection

**Recommended Requirements:**
- **CPU**: 2+ vCPUs
- **RAM**: 2GB+
- **Storage**: 10GB+ SSD
- **Network**: Low latency, reliable connection

### Software Requirements

- **Node.js**: 20.0.0 or higher
- **Package Manager**: pnpm 8.15.0 or higher
- **Process Manager**: PM2, systemd, or Docker
- **Reverse Proxy**: Nginx or Cloudflare (optional but recommended)

### Network Requirements

- **Outbound HTTPS**: Required for scraping external sources
- **Inbound HTTP/HTTPS**: Required for web app access
- **Rate Limiting**: Respect for external source rate limits
- **DNS**: Custom domain recommended for production

## Environment Configuration

### Production Environment Variables

Create `/opt/gigateer/.env` (or your chosen path):

```bash
# Production Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Ingestor Configuration (Conservative Production Settings)
INGESTOR_MODE=production
INGESTOR_DEFAULT_SCHEDULE="0 */3 * * *"  # Every 3 hours
INGESTOR_STAGGER_MINUTES=10               # Longer stagger
INGESTOR_RATE_LIMIT_PER_MIN=30           # Conservative rate limit
INGESTOR_TIMEOUT_MS=45000                # Longer timeout
INGESTOR_LOG_LEVEL=info                  # Less verbose logging

# File Paths (Absolute paths recommended for production)
INGESTOR_RAW_DATA_DIR=/opt/gigateer/data/sources
INGESTOR_LOG_DIR=/opt/gigateer/data/run-logs
INGESTOR_PID_FILE=/opt/gigateer/data/run-logs/ingestor.pid

# Log Retention
INGESTOR_LOG_RETENTION_DAYS=90

# PWA Configuration
NEXT_PUBLIC_PWA_ENABLED=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
NEXT_PUBLIC_CACHE_TTL=900000  # 15 minutes

# Security
CORS_ORIGINS=https://your-domain.com

# Optional: External Services
# SENTRY_DSN=https://your-sentry-dsn
# GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Security Configuration

**File Permissions:**
```bash
# Secure .env file
chmod 600 /opt/gigateer/.env
chown app:app /opt/gigateer/.env

# Secure data directories
chmod 755 /opt/gigateer/data
chmod 755 /opt/gigateer/data/sources
chmod 755 /opt/gigateer/data/run-logs
```

**Firewall Configuration:**
```bash
# Ubuntu/Debian with ufw
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

## Deployment Options

### Option 1: Cloud Platform (Recommended)

**Best for:**
- Quick setup and deployment
- Managed infrastructure
- Automatic scaling
- Built-in CDN and SSL

**Supported Platforms:**
- Vercel (recommended for Next.js)
- Netlify
- Railway
- Digital Ocean App Platform

### Option 2: VPS/Self-Hosted

**Best for:**
- Full control over infrastructure
- Cost optimization for high traffic
- Custom security requirements
- Integration with existing infrastructure

### Option 3: Containerized (Docker)

**Best for:**
- Consistent deployment across environments
- Easy scaling and orchestration
- Development/production parity
- Kubernetes deployments

## Cloud Platform Deployments

### Vercel Deployment (Recommended)

Vercel provides excellent Next.js support with minimal configuration:

**1. Prepare Repository:**
```bash
# Ensure all code is committed
git add .
git commit -m "Production deployment setup"
git push origin main
```

**2. Deploy to Vercel:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project root
cd gigateer
vercel

# Follow prompts:
# - Set up and deploy: Yes
# - Which scope: Your account
# - Link to existing project: No
# - Project name: gigateer
# - Directory: ./
# - Override settings: No
```

**3. Configure Environment Variables:**

In Vercel Dashboard:
1. Go to Project Settings > Environment Variables
2. Add production environment variables:
   ```
   NODE_ENV=production
   NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
   INGESTOR_MODE=production
   INGESTOR_DEFAULT_SCHEDULE=0 */3 * * *
   # ... other variables from production .env
   ```

**4. Custom Domain (Optional):**
1. Go to Project Settings > Domains
2. Add your custom domain
3. Configure DNS records as shown

**5. Ingestor Service Deployment:**

Vercel doesn't support long-running processes, so deploy ingestor separately:

```bash
# Option A: Deploy ingestor to Railway/Heroku/DigitalOcean
# Option B: Run ingestor on separate VPS
# Option C: Use Vercel cron jobs (limited)
```

### Railway Deployment

**1. Deploy Web App:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway new gigateer-web
railway up
```

**2. Deploy Ingestor Service:**
```bash
# Create separate service for ingestor
railway new gigateer-ingestor

# Deploy ingestor as background service
# Configure with production environment variables
```

**3. Configure Services:**
```bash
# Set environment variables
railway variables set NODE_ENV=production
railway variables set INGESTOR_MODE=production
# ... other variables
```

## VPS/Self-Hosted Deployment

### Ubuntu 22.04 LTS Setup

**1. Server Preparation:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
sudo npm install -g pnpm@latest

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install nginx -y
```

**2. Application Setup:**
```bash
# Create app user
sudo adduser --system --group app

# Create application directory
sudo mkdir -p /opt/gigateer
sudo chown app:app /opt/gigateer

# Switch to app user
sudo -u app bash

# Clone repository
cd /opt/gigateer
git clone <repository-url> .

# Install dependencies and build
pnpm install
pnpm build
```

**3. Environment Configuration:**
```bash
# Create production environment file
sudo -u app tee /opt/gigateer/.env << EOF
# Production configuration (see Environment Configuration section)
NODE_ENV=production
# ... other variables
EOF

# Secure environment file
chmod 600 /opt/gigateer/.env
```

**4. PM2 Process Management:**

Create PM2 ecosystem file:
```bash
# /opt/gigateer/ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'gigateer-web',
      script: 'pnpm',
      args: '--filter web start',
      cwd: '/opt/gigateer',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      error_file: '/opt/gigateer/data/run-logs/web-error.log',
      out_file: '/opt/gigateer/data/run-logs/web-out.log',
      log_file: '/opt/gigateer/data/run-logs/web.log',
    },
    {
      name: 'gigateer-ingestor',
      script: 'pnpm',
      args: '--filter ingestor daemon',
      cwd: '/opt/gigateer',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '512M',
      error_file: '/opt/gigateer/data/run-logs/ingestor-error.log',
      out_file: '/opt/gigateer/data/run-logs/ingestor-out.log',
      log_file: '/opt/gigateer/data/run-logs/ingestor.log',
    }
  ]
};
```

**5. Start Services:**
```bash
# Start with PM2
sudo -u app pm2 start /opt/gigateer/ecosystem.config.js

# Setup PM2 startup script
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u app --hp /home/app

# Save PM2 configuration
sudo -u app pm2 save
```

**6. Nginx Configuration:**
```bash
# /etc/nginx/sites-available/gigateer
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # PWA specific headers
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header X-Content-Type-Options nosniff;
        }
        
        location = /manifest.json {
            add_header Cache-Control "no-cache";
        }
        
        location = /service-worker.js {
            add_header Cache-Control "no-cache";
        }
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/gigateer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**7. SSL Certificate (Let's Encrypt):**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Generate SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal is set up automatically
```

## Docker Deployment

### Dockerfile

Create `/opt/gigateer/Dockerfile`:
```dockerfile
# Multi-stage build for production
FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable
RUN corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/contracts/package.json ./packages/contracts/
COPY services/ingestor/package.json ./services/ingestor/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Production stage
FROM node:20-alpine AS production

# Install pnpm
RUN corepack enable
RUN corepack prepare pnpm@latest --activate

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S app -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=base --chown=app:nodejs /app .

# Create data directories
RUN mkdir -p data/sources data/run-logs
RUN chown -R app:nodejs data/

# Switch to app user
USER app

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/meta || exit 1

# Start application
CMD ["pnpm", "start"]
```

### Docker Compose

Create `/opt/gigateer/docker-compose.yml`:
```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_APP_URL=https://your-domain.com
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped
    depends_on:
      - ingestor
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/meta"]
      interval: 30s
      timeout: 10s
      retries: 3

  ingestor:
    build: .
    command: pnpm --filter ingestor daemon
    environment:
      - NODE_ENV=production
      - INGESTOR_MODE=production
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - web
    restart: unless-stopped

volumes:
  data:
  logs:
```

### Deploy with Docker

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Update application
git pull
docker-compose build
docker-compose up -d

# Scale web service
docker-compose up -d --scale web=3
```

## Monitoring and Maintenance

### Log Management

**Centralized Logging:**
```bash
# View all logs
sudo -u app pm2 logs

# View specific service logs
sudo -u app pm2 logs gigateer-web
sudo -u app pm2 logs gigateer-ingestor

# Log rotation (PM2 handles this automatically)
sudo -u app pm2 install pm2-logrotate
```

**Log Monitoring:**
```bash
# Monitor error logs
tail -f /opt/gigateer/data/run-logs/ingestor.log | grep ERROR

# Monitor performance
tail -f /opt/gigateer/data/run-logs/web.log | grep -E "(slow|error|timeout)"
```

### Health Checks

**Application Health:**
```bash
# Check PM2 status
sudo -u app pm2 status

# Check application endpoints
curl -f http://localhost:3000/api/meta
curl -f http://localhost:3000/api/gigs?limit=1

# Check ingestor health
sudo -u app bash -c 'cd /opt/gigateer && pnpm --filter ingestor scheduler:health'
```

**System Health:**
```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
htop

# Check network connectivity
curl -I https://example-venue.com
```

### Automated Backups

**Data Backup Script:**
```bash
#!/bin/bash
# /opt/gigateer/scripts/backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/gigateer"
DATA_DIR="/opt/gigateer/data"

mkdir -p $BACKUP_DIR

# Backup data files
tar -czf $BACKUP_DIR/gigateer_data_$DATE.tar.gz -C $DATA_DIR .

# Keep only last 30 days of backups
find $BACKUP_DIR -name "gigateer_data_*.tar.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/gigateer_data_$DATE.tar.gz"
```

**Cron Setup:**
```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /opt/gigateer/scripts/backup.sh >> /opt/gigateer/data/run-logs/backup.log 2>&1
```

### Update Procedure

**Application Updates:**
```bash
#!/bin/bash
# /opt/gigateer/scripts/update.sh

# Navigate to app directory
cd /opt/gigateer

# Backup current state
./scripts/backup.sh

# Pull latest changes
git pull origin main

# Install dependencies
pnpm install

# Build application
pnpm build

# Restart services
sudo -u app pm2 restart all

# Health check
sleep 10
curl -f http://localhost:3000/api/meta || echo "Health check failed!"

echo "Update completed"
```

## Scaling Considerations

### Horizontal Scaling

**Load Balancing:**
```nginx
# /etc/nginx/sites-available/gigateer (load balancer config)
upstream gigateer_backend {
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
}

server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://gigateer_backend;
        # ... other proxy settings
    }
}
```

**Multiple Ingestor Instances:**
```bash
# Distribute sources across instances
# Instance 1: RSS feeds
INGESTOR_ENABLED_SOURCES=bandsintown,songkick

# Instance 2: Venue websites
INGESTOR_ENABLED_SOURCES=venue1,venue2,venue3
```

### Vertical Scaling

**Memory Optimization:**
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=2048" pm2 start ecosystem.config.js
```

**CPU Optimization:**
```javascript
// ecosystem.config.js - Use cluster mode
module.exports = {
  apps: [{
    name: 'gigateer-web',
    script: 'pnpm',
    args: '--filter web start',
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster',
    // ... other settings
  }]
};
```

### Database Migration (Future)

When migrating from JSON to PostgreSQL:

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres createdb gigateer
sudo -u postgres createuser -P gigateer_user

# Update environment variables
DATABASE_URL=postgresql://gigateer_user:password@localhost:5432/gigateer

# Run migration scripts (when available)
pnpm --filter web db:migrate
```

## Security Checklist

### Application Security

- [ ] Environment variables secured (600 permissions)
- [ ] No secrets in version control
- [ ] HTTPS enabled with valid certificates
- [ ] Security headers configured
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation in place
- [ ] Error messages don't leak sensitive info

### System Security

- [ ] OS and packages updated
- [ ] Firewall configured (only necessary ports open)
- [ ] SSH key-based authentication
- [ ] Regular security updates scheduled
- [ ] Non-root user for application
- [ ] File permissions properly set
- [ ] Log files secured and rotated

### Monitoring Security

- [ ] Failed login attempts monitored
- [ ] Unusual traffic patterns monitored
- [ ] Error rate monitoring
- [ ] Disk space monitoring
- [ ] Certificate expiration monitoring

## Troubleshooting

### Common Production Issues

**Service Won't Start:**
```bash
# Check PM2 logs
sudo -u app pm2 logs gigateer-web --lines 100

# Check port availability
netstat -tlnp | grep :3000

# Check environment variables
sudo -u app bash -c 'cd /opt/gigateer && env | grep -E "(NODE_ENV|INGESTOR_)"'
```

**High Memory Usage:**
```bash
# Check memory usage by process
ps aux --sort=-%mem | head

# Restart if necessary
sudo -u app pm2 restart all

# Consider increasing swap if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

**Scraper Failures:**
```bash
# Check individual scraper
sudo -u app bash -c 'cd /opt/gigateer && pnpm ingest:source bandsintown'

# Check rate limiting
grep -i "rate" /opt/gigateer/data/run-logs/ingestor.log

# Test connectivity
curl -I https://problematic-source.com
```

**SSL Certificate Issues:**
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew --dry-run

# Force renewal if needed
sudo certbot renew --force-renewal
```

**Database Migration Issues (Future):**
```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT NOW();"

# Check migration status
pnpm --filter web db:status

# Rollback if needed
pnpm --filter web db:rollback
```

### Performance Troubleshooting

**Slow Response Times:**
```bash
# Check CPU and memory usage
htop

# Check disk I/O
iotop

# Check network latency
ping your-domain.com

# Profile Node.js performance
NODE_ENV=production --prof pnpm --filter web start
```

**High Error Rates:**
```bash
# Check error logs
grep -c "ERROR" /opt/gigateer/data/run-logs/*.log

# Check HTTP error codes
grep -E "(404|500|502|503)" /var/log/nginx/access.log | tail -20

# Monitor real-time errors
tail -f /opt/gigateer/data/run-logs/web.log | grep ERROR
```

### Emergency Procedures

**Quick Rollback:**
```bash
# Keep previous version in separate directory
cp -r /opt/gigateer /opt/gigateer.backup.$(date +%Y%m%d)

# Rollback to previous version
git reset --hard HEAD~1
pnpm build
sudo -u app pm2 restart all
```

**Service Recovery:**
```bash
# Stop all services
sudo -u app pm2 stop all

# Clear PM2 logs
sudo -u app pm2 flush

# Restart services
sudo -u app pm2 restart all

# If PM2 is corrupted
sudo -u app pm2 kill
sudo -u app pm2 resurrect
```

---

For more technical details, see:
- [Development Guide](./DEVELOPMENT.md)
- [System Design](../architecture/SYSTEM_DESIGN.md)
- [API Documentation](../api/ENDPOINTS.md)