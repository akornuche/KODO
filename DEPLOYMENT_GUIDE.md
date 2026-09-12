# Production Deployment Guide

Complete guide for deploying KODO application to production with multiple deployment options.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Deployment Methods](#deployment-methods)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Deployment Steps](#deployment-steps)
5. [Verification](#verification)
6. [Rollback Procedures](#rollback-procedures)
7. [Troubleshooting](#troubleshooting)
8. [Production Runbook](#production-runbook)

---

## Quick Start

### Linux/Mac Deployment

```bash
# 1. Prepare deployment
chmod +x scripts/deploy.sh
chmod +x scripts/rollback.sh

# 2. Deploy to staging
./scripts/deploy.sh staging

# 3. Deploy to production
./scripts/deploy.sh production

# 4. Verify health
curl https://api.kodo.com/health
```

### Windows Deployment

```powershell
# 1. Deploy to staging
.\scripts\deploy.ps1 -Environment staging

# 2. Deploy to production
.\scripts\deploy.ps1 -Environment production

# 3. Verify health
Invoke-WebRequest https://api.kodo.com/health
```

### Docker Deployment

```bash
# 1. Build and run
docker-compose -f docker-compose.prod.yml up -d

# 2. Check logs
docker-compose -f docker-compose.prod.yml logs -f backend

# 3. Stop
docker-compose -f docker-compose.prod.yml down
```

---

## Deployment Methods

### Method 1: Traditional Server Deployment

**Best for:** Single server or VPS hosting

```bash
# 1. SSH to server
ssh ubuntu@production-server.com

# 2. Clone repository
git clone https://github.com/yourorg/kodo.git
cd kodo

# 3. Copy environment config
scp .env.production ubuntu@production-server.com:kodo/.env.production

# 4. Run deployment script
./scripts/deploy.sh production

# 5. Start application
npm start

# 6. Configure systemd (if using Linux)
sudo cp kodo.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable kodo
sudo systemctl start kodo
```

### Method 2: Docker Deployment

**Best for:** Cloud platforms (AWS ECS, Kubernetes, DigitalOcean)

```bash
# 1. Build Docker image
docker build -t kodo:latest .

# 2. Tag for registry
docker tag kodo:latest your-registry.azurecr.io/kodo:latest

# 3. Push to registry
docker push your-registry.azurecr.io/kodo:latest

# 4. Run with Docker Compose
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# 5. Verify deployment
docker-compose -f docker-compose.prod.yml ps
```

### Method 3: Kubernetes Deployment

**Best for:** Microservices and auto-scaling

```yaml
# Deploy using kubectl
kubectl apply -f kodo-deployment.yaml

# Verify rollout
kubectl rollout status deployment/kodo

# Check logs
kubectl logs -f deployment/kodo

# Scale
kubectl scale deployment kodo --replicas=3
```

### Method 4: Cloud Platform

**AWS Elastic Beanstalk:**
```bash
eb init kodo
eb create production
eb deploy
```

**Azure App Service:**
```bash
az webapp up --name kodo-app --resource-group kodo-rg --runtime node
az webapp config appsettings set -n kodo-app -g kodo-rg --settings NODE_ENV=production
```

**Heroku:**
```bash
heroku create kodo-app
git push heroku main
heroku config:set NODE_ENV=production
```

---

## Pre-Deployment Checklist

### 1 Week Before

- [ ] Security audit complete
- [ ] Performance testing passed
- [ ] Database migrations tested on staging
- [ ] SSL certificates obtained and valid
- [ ] DNS configured correctly
- [ ] CDN setup (if using)
- [ ] Email service configured
- [ ] Payment gateway live credentials added
- [ ] Monitoring and alerting setup
- [ ] Backup procedures tested

### 1 Day Before

- [ ] Final staging deployment
- [ ] Smoke tests passed on staging
- [ ] Load testing completed
- [ ] Team notified and ready
- [ ] Rollback procedure reviewed
- [ ] Stakeholders on standby
- [ ] Communication plan ready

### Day Of

- [ ] Team present and ready
- [ ] Monitoring dashboards open
- [ ] Rollback scripts tested
- [ ] Database backups current
- [ ] Support team briefed

---

## Deployment Steps

### Step 1: Prepare Environment

```bash
# Verify environment configuration
cat .env.production

# Check required variables
echo "DATABASE_URL: $DATABASE_URL"
echo "REDIS_URL: $REDIS_URL"
echo "SENTRY_DSN: $SENTRY_DSN"
echo "JWT_SECRET is set: $([ -n "$JWT_SECRET" ] && echo "YES" || echo "NO")"

# Verify all services running (if local)
docker-compose ps
```

### Step 2: Database Preparation

```bash
# Create database backups
npm run db:backup

# Run migrations (dry-run first)
npm run db:migrate:prod -- --dry-run

# Run actual migrations
npm run db:migrate:prod

# Verify migrations
npm run db:verify
```

### Step 3: Build Application

```bash
# Linux/Mac
./scripts/deploy.sh production

# Windows
.\scripts\deploy.ps1 -Environment production

# Or Docker
docker-compose -f docker-compose.prod.yml build --no-cache
```

### Step 4: Deploy

```bash
# Option A: Traditional (stop old, start new)
npm stop
npm start

# Option B: Blue-Green (new instance, then switch)
npm start --port 3001
# Test new instance
curl http://localhost:3001/health
# Update load balancer or reverse proxy to point to 3001
npm stop --port 3000

# Option C: Docker (recreate containers)
docker-compose -f docker-compose.prod.yml up -d --force-recreate

# Option D: Kubernetes (rolling update)
kubectl set image deployment/kodo kodo=your-registry/kodo:v1.2.3 --record
kubectl rollout status deployment/kodo
```

### Step 5: Verify Deployment

```bash
# Health check
curl https://api.kodo.com/health

# Check logs
tail -f logs/production.log

# Verify database
curl https://api.kodo.com/api/health/db

# Smoke tests
npm run test:smoke

# Check metrics
curl https://api.kodo.com/metrics
```

---

## Verification

### Immediate Verification (Within 5 minutes)

```bash
# 1. Health endpoint
curl -v https://api.kodo.com/health
# Expected: 200 OK

# 2. Database connectivity
curl https://api.kodo.com/api/health/db
# Expected: {"status":"connected"}

# 3. API functionality
curl https://api.kodo.com/api/products?limit=5
# Expected: Product list or error (not 500)

# 4. Frontend load
curl -I https://api.kodo.com/
# Expected: 200 OK, text/html

# 5. Authentication
curl -X POST https://api.kodo.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
# Expected: 401 or valid response
```

### Comprehensive Verification (30 minutes)

```bash
# 1. User Registration
REGISTER=$(curl -X POST https://api.kodo.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test-'$(date +%s)'@example.com","password":"Test123!","name":"Test"}')
echo $REGISTER | grep -q '"id"' && echo "✓ Registration works" || echo "✗ Registration failed"

# 2. User Login
LOGIN=$(curl -X POST https://api.kodo.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}')
TOKEN=$(echo $LOGIN | grep -o '"token":"[^"]*' | cut -d'"' -f4)
[ -n "$TOKEN" ] && echo "✓ Login works" || echo "✗ Login failed"

# 3. Protected Route
curl -H "Authorization: Bearer $TOKEN" https://api.kodo.com/api/user/profile | grep -q '"email"' && echo "✓ Protected routes work" || echo "✗ Protected routes failed"

# 4. Database Read
curl https://api.kodo.com/api/products | grep -q '"items"' && echo "✓ Database reads work" || echo "✗ Database reads failed"

# 5. Error Handling
curl https://api.kodo.com/api/products/invalid | grep -q '"error"' && echo "✓ Error handling works" || echo "✗ Error handling failed"
```

---

## Rollback Procedures

### Quick Rollback (< 5 minutes)

```bash
# List available backups
ls -la backups/deployment_*

# Rollback to latest
./scripts/rollback.sh latest

# Or specify backup
./scripts/rollback.sh deployment_20260820_020000
```

### Detailed Rollback

```bash
# 1. Check backup integrity
gzip -t backups/deployment_*/db_backup.sql.gz

# 2. Stop application
systemctl stop kodo

# 3. Restore files
cp -r backups/deployment_20260820_020000/dist_backup ./dist

# 4. Restore database (if needed)
gunzip -c backups/deployment_20260820_020000/db_backup.sql.gz | psql kodo_prod

# 5. Restart application
systemctl start kodo

# 6. Verify
curl https://api.kodo.com/health
```

### Database-Only Rollback

```bash
# If only database needs rollback (not code)

# 1. Create backup of current database
npm run db:backup

# 2. Restore from previous backup
gunzip -c backups/kodo_db_full_20260820_020000.sql.gz | psql kodo_prod

# 3. Verify data
psql kodo_prod -c "SELECT COUNT(*) FROM users;"

# 4. Restart application (if needed)
systemctl restart kodo
```

---

## Troubleshooting

### Application Won't Start

```bash
# 1. Check logs
tail -100 logs/production.log
tail -100 logs/error.log

# 2. Verify environment
env | grep NODE_ENV
env | grep DATABASE_URL

# 3. Check dependencies
npm list

# 4. Verify database connection
node -e "const db = require('./db'); db.connect().then(() => console.log('✓ Connected')).catch(e => console.error(e))"

# 5. Check ports
lsof -i :3000

# 6. Check file permissions
ls -la server/app.js
```

### Database Connection Issues

```bash
# 1. Verify connection string
echo $DATABASE_URL

# 2. Test PostgreSQL connection
psql "$DATABASE_URL"

# 3. Check network connectivity
ping -c 1 $(echo $DATABASE_URL | grep -oP '(?<=@)\d+\.\d+\.\d+\.\d+')

# 4. Check database exists
psql -l

# 5. Check tables
psql kodo_prod -c "\dt"
```

### Performance Issues

```bash
# 1. Check CPU/Memory
top -b -n 1
free -h

# 2. Check logs for slow queries
tail logs/combined.log | grep "duration"

# 3. Check Sentry for errors
# Visit https://sentry.io

# 4. Monitor database
psql kodo_prod -c "SELECT COUNT(*) FROM pg_stat_statements;"

# 5. Check cache
redis-cli INFO stats
```

### SSL Certificate Issues

```bash
# 1. Check certificate validity
openssl x509 -in /etc/nginx/ssl/cert.pem -text -noout

# 2. Check expiration
openssl x509 -enddate -noout -in /etc/nginx/ssl/cert.pem

# 3. Verify chain
openssl verify -CAfile /etc/nginx/ssl/chain.pem /etc/nginx/ssl/cert.pem

# 4. Reload Nginx
nginx -t && systemctl reload nginx
```

---

## Production Runbook

### Daily Checklist

```bash
#!/bin/bash
# Run every morning

echo "=== KODO Production Daily Checklist ==="

# 1. Health check
echo -n "API Health: "
curl -s https://api.kodo.com/health | grep -q '"status":"healthy"' && echo "✓" || echo "✗"

# 2. Database check
echo -n "Database: "
curl -s https://api.kodo.com/api/health/db | grep -q '"status":"connected"' && echo "✓" || echo "✗"

# 3. Backup check
echo -n "Latest Backup: "
ls -lt backups/kodo_db_full_* | head -1 | awk '{print $6, $7, $8}'

# 4. Error rate
echo "Recent Errors (last hour):"
tail -1000 logs/error.log | grep "$(date +%H)" | wc -l

# 5. System resources
echo "System Resources:"
free -h | grep Mem
```

### Weekly Checklist

- [ ] Backup integrity test
- [ ] Database growth analysis
- [ ] Error log review
- [ ] Performance metrics review
- [ ] Security scan
- [ ] Uptime report
- [ ] User feedback review
- [ ] Third-party service status check

### Monthly Checklist

- [ ] Disaster recovery drill
- [ ] Database maintenance
- [ ] Certificate renewal check
- [ ] Dependency updates
- [ ] Security audit
- [ ] Capacity planning
- [ ] Cost optimization review
- [ ] Incident post-mortem (if applicable)

---

## Emergency Contacts

```
Production Issues:
- On-call Engineer: +1-XXX-XXX-XXXX
- Team Lead: team-lead@kodo.com
- CTO: cto@kodo.com

Escalation:
- Level 1: Engineering Team (30 min response)
- Level 2: CTO + Team Lead (15 min response)
- Level 3: Founder + All Leadership (5 min response)
```

---

## Success Criteria

Deployment is considered successful when:

1. ✅ Health endpoint returns 200 OK
2. ✅ Database connectivity verified
3. ✅ All 4 user roles (admin, seller, buyer, courier) can login
4. ✅ Critical flows work (search, product view, checkout)
5. ✅ Error rate < 0.1%
6. ✅ Average response time < 500ms
7. ✅ No recent errors in logs
8. ✅ All monitoring alerts green
9. ✅ Zero downtime achieved
10. ✅ Stakeholders confirmed success

---

## Deployment Statistics

Target metrics:
- **Deployment Time**: < 15 minutes
- **Downtime**: 0 seconds (blue-green)
- **Rollback Time**: < 5 minutes
- **Database Recovery**: < 10 minutes
- **Post-deployment Verification**: < 5 minutes

