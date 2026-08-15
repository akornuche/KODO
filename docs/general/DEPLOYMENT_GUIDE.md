# KODO Platform - Deployment Guide

**Date:** August 4, 2026  
**Version:** 1.0.0  
**Status:** ✅ Production Ready

---

## 📋 Pre-Deployment Checklist

### Code Quality ✅
- [x] Unit tests passing (184/184)
- [x] Frontend tests passing (7/7)
- [x] All endpoints implemented
- [x] Error handling in place
- [x] Input validation configured
- [x] Security headers enabled
- [x] Rate limiting configured
- [x] CORS configured

### Documentation ✅
- [x] API documentation complete
- [x] Implementation guide written
- [x] Deployment guide (this file)
- [x] Testing summary documented
- [x] Architecture documented
- [x] Database schema documented

### Database ✅
- [x] 35+ models created
- [x] Prisma schema complete
- [x] Migrations ready
- [x] Seed data scripts ready
- [x] Backup strategy planned
- [x] Connection pooling configured

### Frontend ✅
- [x] 23 components created
- [x] All views implemented
- [x] Routing configured
- [x] State management (Pinia) ready
- [x] API integration layer complete
- [x] Error handling implemented
- [x] Loading states configured

### Security ✅
- [x] JWT authentication working
- [x] Role-based access control
- [x] Input sanitization enabled
- [x] XSS protection active
- [x] SQL injection protection (Prisma)
- [x] Rate limiting configured
- [x] HTTPS ready
- [x] GDPR compliance tools included

---

## 🚀 Deployment Steps

### Phase 1: Environment Setup (1-2 hours)

#### 1.1 Production Server Preparation
```bash
# On production server
cd /var/www/kodo

# Clone repository
git clone <repository-url> .

# Install backend dependencies
cd server
npm install --production

# Install frontend dependencies
cd ../client
npm install --production

# Build frontend
npm run build
```

#### 1.2 Environment Configuration
```bash
# Create production .env files
cd server
cp .env.example .env.production
# Edit with production values:
# - DATABASE_URL (PostgreSQL connection)
# - JWT_SECRET (strong random key)
# - NODE_ENV=production
# - STRIPE_SECRET_KEY
# - FLUTTERWAVE credentials
# - Email configuration
# - File upload credentials
```

#### 1.3 Database Setup
```bash
# Run migrations
npm run migrate:prod

# Seed initial data
npm run seed

# Verify database connection
npm run db:test
```

### Phase 2: Backend Deployment (30 minutes)

#### 2.1 Build Backend
```bash
cd server

# Generate Prisma client for production
npx prisma generate

# Verify all dependencies
npm audit

# Optional: Fix vulnerabilities
npm audit fix
```

#### 2.2 Start Backend Service
```bash
# Using PM2 (recommended)
npm install -g pm2
pm2 start server.js --name "kodo-api"
pm2 save
pm2 startup

# Or using systemd
sudo cp deployment/kodo-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable kodo-api
sudo systemctl start kodo-api
```

#### 2.3 Verify Backend
```bash
# Check health endpoint
curl http://localhost:4000/health

# Monitor logs
pm2 logs kodo-api
# or
sudo journalctl -u kodo-api -f
```

### Phase 3: Frontend Deployment (30 minutes)

#### 3.1 Build Frontend
```bash
cd client

# Production build with optimization
npm run build

# Output in dist/ directory
```

#### 3.2 Configure Web Server

**Using Nginx (Recommended):**
```nginx
server {
    listen 80;
    server_name kodo.example.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name kodo.example.com;
    
    ssl_certificate /etc/letsencrypt/live/kodo.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kodo.example.com/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    root /var/www/kodo/client/dist;
    index index.html;
    
    # SPA routing - fallback to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket support
    location /socket.io {
        proxy_pass http://localhost:4000/socket.io;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_vary on;
}
```

#### 3.3 Set Up SSL Certificate
```bash
# Using Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d kodo.example.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

#### 3.4 Verify Frontend
```bash
# Test website
curl https://kodo.example.com

# Check SSL
openssl s_client -connect kodo.example.com:443
```

### Phase 4: Database Backup & Monitoring (30 minutes)

#### 4.1 Configure Automated Backups
```bash
# Daily database backup script
cat > /usr/local/bin/backup-kodo-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/kodo"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# PostgreSQL backup
pg_dump kodo_production > $BACKUP_DIR/kodo_$DATE.sql

# Compress
gzip $BACKUP_DIR/kodo_$DATE.sql

# Keep only last 30 days
find $BACKUP_DIR -mtime +30 -delete

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/kodo_$DATE.sql.gz s3://kodo-backups/
EOF

chmod +x /usr/local/bin/backup-kodo-db.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-kodo-db.sh") | crontab -
```

#### 4.2 Set Up Monitoring
```bash
# Install monitoring tools
npm install -g pm2-plus
pm2 plus

# Or use Sentry
npm install @sentry/node @sentry/tracing

# Add to server/app.js:
const Sentry = require("@sentry/node");
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
app.use(Sentry.Handlers.requestHandler());
```

#### 4.3 Configure Logging
```bash
# Install Winston for logging
npm install winston winston-daily-rotate-file

# Logs will be stored in /var/log/kodo/
```

### Phase 5: Post-Deployment Verification (1 hour)

#### 5.1 API Testing
```bash
# Test authentication
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "role": "buyer"
  }'

# Test protected endpoint
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:4000/api/user/profile

# Test real-time features
# Connect WebSocket client to ws://kodo.example.com/socket.io
```

#### 5.2 Frontend Testing
- [ ] Visit https://kodo.example.com
- [ ] Test user registration
- [ ] Test buyer flow (search, bid, order)
- [ ] Test seller flow (create products, manage listings)
- [ ] Test courier flow (view deliveries)
- [ ] Test real-time chat
- [ ] Test notifications
- [ ] Test responsive design on mobile

#### 5.3 Performance Testing
```bash
# Load testing with Apache Bench
ab -n 1000 -c 100 http://localhost:4000/api/products

# Or use Artillery
npm install -g artillery
artillery quick --count 100 --num 1000 http://localhost:4000/api/products
```

#### 5.4 Security Verification
- [ ] SSL certificate valid
- [ ] Security headers present
- [ ] Rate limiting working
- [ ] Input validation active
- [ ] Authentication required for protected routes
- [ ] CORS properly configured
- [ ] No sensitive data in logs

---

## 🔄 Continuous Deployment (CI/CD Setup)

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: kodo_test
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install backend dependencies
        run: cd server && npm ci
      
      - name: Run backend tests
        run: cd server && npm test
      
      - name: Install frontend dependencies
        run: cd client && npm ci
      
      - name: Run frontend tests
        run: cd client && npm run test -- --run
      
      - name: Build frontend
        run: cd client && npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to production
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
          DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
          DEPLOY_USER: ${{ secrets.DEPLOY_USER }}
        run: |
          mkdir -p ~/.ssh
          echo "$DEPLOY_KEY" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan -H $DEPLOY_HOST >> ~/.ssh/known_hosts
          ssh $DEPLOY_USER@$DEPLOY_HOST 'cd /var/www/kodo && bash scripts/deploy.sh'
```

---

## 📊 Performance Optimization

### Frontend Optimization
```bash
# Generate build report
npm run build -- --report

# Analyze bundle size
npm install -g webpack-bundle-analyzer
```

### Backend Optimization
```javascript
// Enable caching headers
app.use((req, res, next) => {
  if (req.path.match(/\.(jpg|jpeg|png|gif|js|css)$/)) {
    res.set('Cache-Control', 'public, max-age=31536000');
  }
  next();
});

// Enable compression
const compression = require('compression');
app.use(compression());
```

### Database Optimization
```sql
-- Add indexes for common queries
CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_deliveries_courier ON deliveries(courier_id);
CREATE INDEX idx_products_category ON products(category);

-- Enable query statistics
CREATE EXTENSION pg_stat_statements;
```

---

## 🔐 Security Hardening

### SSL/TLS Configuration
```bash
# Use strong cipher suites
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
ssl_prefer_server_ciphers on;
```

### Rate Limiting Activation
```javascript
// Already configured in server/app.js
// Just ensure it's enabled in production
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use('/api/', apiLimiter);
```

### Environment Secrets
```bash
# Never commit secrets to git
# Use environment variables instead
export DATABASE_URL="postgresql://..."
export JWT_SECRET="$(openssl rand -hex 32)"
export STRIPE_SECRET_KEY="sk_live_..."

# Use secret management tools
# - AWS Secrets Manager
# - HashiCorp Vault
# - Azure Key Vault
```

---

## 📈 Monitoring & Alerts

### Key Metrics to Monitor
1. **Server Health**
   - CPU usage
   - Memory usage
   - Disk space
   - Network throughput

2. **Application Health**
   - API response time
   - Error rate
   - Request count
   - Database query time

3. **Business Metrics**
   - Orders per hour
   - Conversion rate
   - Average order value
   - User registration rate

### Alert Thresholds
```javascript
// Example alert configuration
{
  "cpu_usage > 80%": "Send alert",
  "api_response_time > 1000ms": "Send warning",
  "error_rate > 5%": "Send critical alert",
  "disk_usage > 90%": "Send alert",
  "database_connection_pool_exhausted": "Send critical alert"
}
```

---

## 🆘 Rollback Procedure

If deployment goes wrong:

```bash
# 1. Stop current services
pm2 stop kodo-api
nginx -s stop

# 2. Restore from backup
cd /var/www/kodo
git checkout <previous-commit-hash>

# 3. Restore database
gunzip /var/backups/kodo/kodo_<date>.sql.gz
psql kodo_production < /var/backups/kodo/kodo_<date>.sql

# 4. Restart services
pm2 start kodo-api
nginx -s start

# 5. Verify
curl https://kodo.example.com
```

---

## 📋 Post-Deployment Checklist

### First 24 Hours
- [ ] Monitor error logs
- [ ] Check API response times
- [ ] Verify database backups
- [ ] Monitor user reports
- [ ] Check SSL certificate validity
- [ ] Review security headers

### First Week
- [ ] Collect performance metrics
- [ ] Optimize slow queries
- [ ] Update monitoring rules
- [ ] Document any issues
- [ ] Plan improvements
- [ ] Communicate status

### First Month
- [ ] Analyze user behavior
- [ ] Optimize frontend bundle
- [ ] Review security audit results
- [ ] Plan scaling strategy
- [ ] Collect feedback
- [ ] Plan next features

---

## 🎯 Deployment Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Preparation** | 1-2 hrs | Env setup, DB migration |
| **Backend Deploy** | 30 min | Build, start, verify |
| **Frontend Deploy** | 30 min | Build, configure, verify |
| **Monitoring Setup** | 30 min | Backups, logging, alerts |
| **Verification** | 1 hr | Testing, security check |
| **Total** | **3.5-4 hours** | Full production launch |

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue: Database connection refused**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify connection string
echo $DATABASE_URL

# Test connection
psql -U postgres -h localhost -d kodo_production
```

**Issue: API not responding**
```bash
# Check if service is running
pm2 status

# Check logs
pm2 logs kodo-api

# Restart service
pm2 restart kodo-api
```

**Issue: High memory usage**
```bash
# Check processes
top

# Increase Node.js heap
pm2 start server.js --max-memory-restart 500M
```

**Issue: Slow API response**
```bash
# Enable query logging
EXPLAIN ANALYZE SELECT * FROM products WHERE category = 'electronics';

# Add indexes if needed
CREATE INDEX idx_products_category ON products(category);

# Check connection pool
psql -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"
```

---

## ✅ Final Checklist Before Going Live

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations completed
- [ ] SSL certificate installed
- [ ] Backups configured and tested
- [ ] Monitoring and alerting set up
- [ ] Load balancer configured (if needed)
- [ ] CDN configured (if needed)
- [ ] Security audit completed
- [ ] Performance testing completed
- [ ] Documentation updated
- [ ] Team trained on deployment process
- [ ] Rollback procedure documented
- [ ] On-call support assigned

---

## 🚀 You're Ready!

The KODO platform is now ready for production deployment. Follow the steps above and your marketplace will be live within 4 hours.

**Good luck! 🎉**
