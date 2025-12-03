# KODO Platform - Deployment Guide

## Production Deployment Checklist

### Pre-Deployment

#### 1. Environment Configuration ✅
```env
# Production Environment Variables
NODE_ENV=production
PORT=4000

# Database (PostgreSQL Production)
DATABASE_URL=postgresql://user:pass@host:5432/kododb?connection_limit=20&pool_timeout=30

# JWT Configuration
JWT_SECRET=<generate-strong-random-secret-32+chars>
JWT_EXPIRES_IN=7d

# CORS
CORS_ALLOWED_ORIGINS=https://kodo.com,https://www.kodo.com,https://api.kodo.com

# Redis (for caching and rate limiting)
REDIS_URL=redis://redis-host:6379

# Payment Gateways
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-...
FLUTTERWAVE_SECRET_KEY=FLWSECK-...

# Cloud Storage
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
EMAIL_FROM=noreply@kodo.com

# Push Notifications
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
FIREBASE_PROJECT_ID=kodo-prod
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...

# URLs
FRONTEND_URL=https://kodo.com
BACKEND_URL=https://api.kodo.com

# Security
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp
MAX_FILE_SIZE=5242880
```

#### 2. Database Setup ✅
```bash
# Run migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# Seed database (if needed)
node prisma/seed/seed.js
```

#### 3. Build & Dependencies ✅
```bash
# Install production dependencies only
npm ci --only=production

# Run tests
npm test

# Security audit
npm audit fix
```

---

## Deployment Options

### Option 1: Traditional VPS (Ubuntu/Debian)

#### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install Nginx
sudo apt install -y nginx

# Install PM2 (process manager)
sudo npm install -g pm2
```

#### 2. Database Configuration
```bash
# Create database
sudo -u postgres psql
CREATE DATABASE kododb;
CREATE USER kodo_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE kododb TO kodo_user;
\q

# Configure PostgreSQL for production
sudo nano /etc/postgresql/14/main/postgresql.conf
# Set: max_connections = 100, shared_buffers = 256MB
sudo systemctl restart postgresql
```

#### 3. Application Deployment
```bash
# Clone repository
cd /var/www
sudo git clone https://github.com/akornuche/KODO.git kodo
cd kodo/server

# Install dependencies
npm ci --only=production

# Configure environment
sudo cp .env.example .env
sudo nano .env  # Edit with production values

# Run migrations
npx prisma migrate deploy

# Start with PM2
pm2 start server.js --name kodo-api
pm2 save
pm2 startup
```

#### 4. Nginx Configuration
```nginx
# /etc/nginx/sites-available/kodo
server {
    listen 80;
    server_name api.kodo.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.kodo.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.kodo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.kodo.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy settings
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support for Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    # Client max body size
    client_max_body_size 10M;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/kodo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Install SSL certificate
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.kodo.com
```

---

### Option 2: Docker Deployment

#### 1. Dockerfile
```dockerfile
# /server/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 4000

CMD ["node", "server.js"]
```

#### 2. Docker Compose (Production)
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: kodo_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: kododb
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - kodo_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: kodo_redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - kodo_network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: kodo_api
    restart: unless-stopped
    ports:
      - "4000:4000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/kododb
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
    depends_on:
      - postgres
      - redis
    networks:
      - kodo_network
    volumes:
      - ./uploads:/app/uploads
    command: sh -c "npx prisma migrate deploy && node server.js"

  nginx:
    image: nginx:alpine
    container_name: kodo_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - api
    networks:
      - kodo_network

volumes:
  postgres_data:
  redis_data:

networks:
  kodo_network:
    driver: bridge
```

```bash
# Deploy with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f api

# Update deployment
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --build
```

---

### Option 3: Cloud Platform (Heroku, Railway, Render)

#### Heroku Deployment
```bash
# Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Login
heroku login

# Create app
heroku create kodo-api

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Add Redis
heroku addons:create heroku-redis:hobby-dev

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=<your-secret>
heroku config:set FRONTEND_URL=https://kodo.com

# Deploy
git push heroku main

# Run migrations
heroku run npx prisma migrate deploy

# View logs
heroku logs --tail
```

---

## Monitoring & Maintenance

### 1. PM2 Monitoring
```bash
# View status
pm2 status

# Monitor logs
pm2 logs kodo-api

# Restart
pm2 restart kodo-api

# Monitor resources
pm2 monit
```

### 2. Log Management
```bash
# Install log rotation
sudo apt install -y logrotate

# Configure log rotation
sudo nano /etc/logrotate.d/kodo
```

```
/var/www/kodo/server/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 nodejs nodejs
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 3. Database Backups
```bash
# Automated backup script
cat > /usr/local/bin/backup-kodo.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/kodo"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -U kodo_user kododb > $BACKUP_DIR/kododb_$DATE.sql
gzip $BACKUP_DIR/kododb_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete
EOF

chmod +x /usr/local/bin/backup-kodo.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /usr/local/bin/backup-kodo.sh" | sudo crontab -
```

### 4. Health Checks
```bash
# Create health check endpoint monitor
curl -s https://api.kodo.com/health | jq

# Automated monitoring with UptimeRobot or similar
# Configure alerts for:
# - API downtime
# - High error rates
# - Slow response times
# - Database connection issues
```

---

## Performance Tuning

### 1. Node.js Optimization
```bash
# PM2 cluster mode
pm2 start server.js -i max --name kodo-api

# Memory limits
pm2 start server.js --max-memory-restart 1G
```

### 2. Database Optimization
```sql
-- Add indexes (if not already present)
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING GIN (to_tsvector('english', title || ' ' || description));
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);

-- Analyze tables
ANALYZE products;
ANALYZE orders;
ANALYZE deliveries;

-- Vacuum
VACUUM ANALYZE;
```

### 3. Redis Caching
```javascript
// Already implemented in src/lib/kodoCache.js
// Monitor cache hit rates
redis-cli INFO stats
```

---

## Security Hardening (Production)

### 1. Firewall Configuration
```bash
# UFW Setup
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### 2. Fail2Ban (DDoS Protection)
```bash
# Install
sudo apt install -y fail2ban

# Configure
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local
```

### 3. SSL Configuration
```bash
# Auto-renew SSL certificates
sudo certbot renew --dry-run

# Add to crontab
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

---

## Rollback Procedure

```bash
# PM2 rollback
pm2 stop kodo-api
cd /var/www/kodo
git checkout <previous-commit>
npm ci --only=production
npx prisma migrate deploy
pm2 restart kodo-api

# Database rollback
psql kododb < /var/backups/kodo/kododb_YYYYMMDD_HHMMSS.sql
```

---

## CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: cd server && npm ci
    
    - name: Run tests
      run: cd server && npm test
    
    - name: Deploy to server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /var/www/kodo
          git pull origin main
          cd server
          npm ci --only=production
          npx prisma migrate deploy
          pm2 restart kodo-api
```

---

## Support & Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql
   
   # Check connection string
   echo $DATABASE_URL
   ```

2. **High Memory Usage**
   ```bash
   # Check PM2 processes
   pm2 monit
   
   # Restart with memory limit
   pm2 restart kodo-api --max-memory-restart 1G
   ```

3. **Slow API Response**
   ```bash
   # Check database performance
   sudo -u postgres psql kododb
   SELECT * FROM pg_stat_activity;
   
   # Check Redis
   redis-cli INFO stats
   ```

---

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrated
- [ ] SSL certificates installed
- [ ] Nginx configured
- [ ] PM2 running
- [ ] Redis connected
- [ ] Backups configured
- [ ] Monitoring setup
- [ ] Logs rotating
- [ ] Firewall enabled
- [ ] Health checks passing
- [ ] Performance tested
- [ ] Security audit complete

---

**Status:** ✅ Ready for Production Deployment
**Last Updated:** November 20, 2025
