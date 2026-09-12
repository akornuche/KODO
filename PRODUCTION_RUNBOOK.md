# KODO Production Runbook

Complete operational guide for deploying, maintaining, and troubleshooting KODO in production.

---

## 📋 Table of Contents

1. [Pre-Launch Checklist](#pre-launch-checklist)
2. [Deployment Procedures](#deployment-procedures)
3. [Post-Deployment Verification](#post-deployment-verification)
4. [Monitoring & Alerting](#monitoring--alerting)
5. [Incident Response](#incident-response)
6. [Maintenance Procedures](#maintenance-procedures)
7. [Scaling & Performance](#scaling--performance)
8. [Emergency Procedures](#emergency-procedures)
9. [Contacts & Escalation](#contacts--escalation)

---

## Pre-Launch Checklist

### 48 Hours Before Launch

**Code & Testing**
- [ ] All tests passing (unit, integration, critical flows)
- [ ] Code review completed
- [ ] Security scan passed
- [ ] Performance baseline established
- [ ] Database migrations tested on staging

**Infrastructure**
- [ ] SSL certificates valid and configured
- [ ] DNS records pointing to production
- [ ] Load balancer configured and tested
- [ ] CDN caching rules configured
- [ ] Backup system operational

**Monitoring**
- [ ] Sentry project created and configured
- [ ] Monitoring alerts configured
- [ ] Log aggregation active
- [ ] Performance dashboard set up
- [ ] Pagerduty/Slack integration tested

**Documentation**
- [ ] Runbook reviewed and approved
- [ ] Team trained on deployment
- [ ] Escalation procedures communicated
- [ ] Customer communication prepared

### 24 Hours Before Launch

**Final Verification**
- [ ] Production database backup created
- [ ] Rollback plan tested
- [ ] All services responding on staging
- [ ] Load test passed (1000 concurrent users)
- [ ] CDN purge procedure verified

**Team Preparation**
- [ ] On-call engineer assigned
- [ ] Deployment team online and ready
- [ ] Communication channels open
- [ ] Status page prepared

### 1 Hour Before Launch

**Pre-Deployment**
- [ ] Final code pull
- [ ] Environment variables verified
- [ ] Secrets configured correctly
- [ ] Database ready
- [ ] Cache cleared

---

## Deployment Procedures

### Standard Deployment (Blue-Green)

```bash
# 1. Prepare new environment (GREEN)
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# 2. Run database migrations
npm run db:migrate:prod

# 3. Health check new environment
curl http://localhost:3001/health

# 4. Route traffic to new environment
# Update load balancer: 0% old (BLUE) → 100% new (GREEN)

# 5. Monitor for errors
tail -f logs/production.log

# 6. Keep old environment running for 30 minutes for quick rollback
# After 30 minutes, stop old environment
docker-compose down
```

### Rolling Deployment (Kubernetes)

```bash
# 1. Create new deployment
kubectl set image deployment/kodo kodo=registry/kodo:v1.2.3 --record

# 2. Monitor rollout
kubectl rollout status deployment/kodo

# 3. Check pod status
kubectl get pods -l app=kodo

# 4. Verify new version
kubectl exec -it <pod-name> -- npm run db:verify

# 5. If issues, rollback immediately
kubectl rollout undo deployment/kodo
```

### Emergency Deployment (Hotfix)

```bash
# 1. Cherry-pick fix commit
git cherry-pick <commit-hash>

# 2. Tag as hotfix
git tag -a v1.2.3-hotfix1 -m "Hotfix: Critical bug fix"

# 3. Build and test immediately
npm run build
npm run test:integration -- critical-flows.integration.test.js

# 4. Deploy (expedited)
./scripts/deploy.sh production

# 5. Monitor intensively
watch 'curl -s http://localhost:3000/health'
```

---

## Post-Deployment Verification

### Immediate Checks (First 5 Minutes)

```bash
# 1. Health endpoint
curl -v https://api.kodo.com/health
# Expected: 200 OK, { "status": "healthy" }

# 2. Database connectivity
curl https://api.kodo.com/api/health/db
# Expected: { "status": "connected" }

# 3. API response time
time curl https://api.kodo.com/api/products
# Expected: < 500ms

# 4. Check logs for errors
tail -100 logs/production.log | grep ERROR

# 5. Monitor dashboard
open https://monitoring.kodo.com
```

### Comprehensive Checks (First 30 Minutes)

**User Registration**
```bash
# Test buyer registration
curl -X POST https://api.kodo.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-buyer@kodo.com",
    "password": "TestBuyer123!",
    "role": "buyer"
  }'
# Expected: 201 Created with token
```

**Product Browsing**
```bash
# Test product listing
curl https://api.kodo.com/api/products?limit=20
# Expected: 200 OK with products array
```

**Order Creation**
```bash
# Test order creation (if products exist)
curl -X POST https://api.kodo.com/api/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"items": [{"productId": "xyz", "quantity": 1}]}'
# Expected: 200 OK or validation error (not 500)
```

**Admin Access**
```bash
# Test admin panel
curl -H "Authorization: Bearer <admin-token>" \
  https://api.kodo.com/api/admin/users
# Expected: 200 OK with users list
```

### Performance Baseline (First Hour)

```bash
# Run performance check
npm run perf:check

# Load test
artillery run tests/load-test.yml

# Bundle analysis
npm run build:analyze

# Generate report
npm run test:coverage
```

---

## Monitoring & Alerting

### Key Metrics Dashboard

**Real-Time Dashboard**: https://monitoring.kodo.com

Track these metrics:

```
Application Metrics:
├── Request Rate (target: < 10k/min)
├── Error Rate (target: < 0.1%)
├── Response Time (target: p95 < 500ms)
├── Active Users (target: up and increasing)
└── Transaction Success Rate (target: > 99%)

Infrastructure Metrics:
├── CPU Usage (target: < 70%)
├── Memory Usage (target: < 80%)
├── Disk Usage (target: < 85%)
├── Network I/O (target: < 100Mbps)
└── Database Connections (target: < 80% of pool)

Business Metrics:
├── Orders Created (track trends)
├── Revenue (track patterns)
├── Users Registered (track growth)
├── Active Sellers (track participation)
└── Completed Deliveries (track operations)
```

### Alert Thresholds

```
Critical Alerts (Page On-Call):
├── Error Rate > 1%
├── Response Time p95 > 2000ms
├── Database Unavailable
├── Memory > 95%
├── Disk > 95%
└── More than 10 errors in 5 minutes

Warning Alerts (Slack Notification):
├── Error Rate > 0.5%
├── Response Time p95 > 1000ms
├── Memory > 85%
├── Disk > 90%
└── CPU > 80%

Info Alerts (Dashboard Only):
├── Slow queries detected
├── High cache miss rate
└── Database replicas lagging
```

### Setting Up Alerts

```bash
# Sentry alerts configured in:
# admin.sentry.io → kodo-project → Alerts

# Example critical alert:
# - If: Event count is greater than 10
# - In the last: 5 minutes
# - For: error
# - Then: Send Slack notification + Page on-call
```

---

## Incident Response

### 1. Incident Detection

**Automated Detection** (Sentry, monitoring)
- Alerts automatically fired
- On-call engineer notified
- Incident logged in Sentry

**Manual Detection** (User reports)
- Support team notified
- Details collected
- Incident ticket created

### 2. Initial Response (0-5 minutes)

```
ASSESS:
├── Check monitoring dashboard
├── Review recent error logs
├── Check Sentry for error patterns
└── Verify external service status

COMMUNICATE:
├── Acknowledge alert/report
├── Update status page
├── Notify team in Slack
└── Get current on-call engineer

TRIAGE:
├── Is database accessible? → Database incident
├── Is API responding? → API incident
├── Is there a pattern? → Code regression
├── Single user or widespread? → Scope severity
└── Assign severity level (1-4)
```

### 3. Investigation (5-15 minutes)

**For API Errors**
```bash
# Check error logs
tail -1000 logs/error.log | grep -A 5 "ERROR"

# Check Sentry for stack traces
open https://sentry.io/kodo-project

# Check if code was just deployed
git log --oneline -1

# Check API response times
curl -w "@curl-format.txt" -o /dev/null https://api.kodo.com/health

# Check database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pg_stat_activity;"
```

**For Database Issues**
```bash
# Check connection pool
redis-cli INFO

# Check slow queries
tail logs/production.log | grep "duration.*ms"

# Check replication lag (if replicated)
psql -c "SELECT slot_name, restart_lsn, confirmed_flush_lsn FROM pg_replication_slots;"

# Check disk space
df -h
```

**For Performance Degradation**
```bash
# Check load
top -b -n 1

# Check cache hit rate
redis-cli INFO stats | grep hits

# Check query performance
npm run perf:check

# Check if traffic spike
grep "GET /api" logs/production.log | wc -l
```

### 4. Mitigation (Based on Issue Type)

**High Error Rate (> 1% or > 100 errors/min)**

Option 1: Quick Restart
```bash
# If it's a memory leak or zombie processes
systemctl restart kodo
# Monitor for 5 minutes
```

Option 2: Rollback
```bash
# If recently deployed
./scripts/rollback.sh deployment_YYYYMMDD_HHMMSS

# Or use Kubernetes
kubectl rollout undo deployment/kodo
```

Option 3: Scale Up
```bash
# If traffic spike
kubectl scale deployment kodo --replicas=5

# Monitor before reverting
watch kubectl get pods
```

**Database Connection Issues**

Option 1: Check Connection Pool
```bash
psql $DATABASE_URL -c "SELECT max_conn, now_open, reserved, unused FROM pgbouncer_pools;"
```

Option 2: Kill Idle Connections
```bash
psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
WHERE idle_in_transaction AND state = 'idle' AND state_change < now() - interval '10 minutes';"
```

Option 3: Restart Database Connection Pool
```bash
systemctl restart pgbouncer
```

**Disk Space Issues**

```bash
# Find large files
du -sh /* | sort -h

# Clean old logs
find logs/ -mtime +30 -delete

# Check database size
psql -c "SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) 
FROM pg_database ORDER BY pg_database_size(pg_database.datname) DESC;"

# Vacuum database
psql -c "VACUUM ANALYZE;"
```

### 5. Communication

```
Initial Alert (1 minute):
"⚠️  SEV-2: API Error Rate 2% detected at 14:32 UTC"

Investigation (5 minutes):
"🔍 Investigating: Recent deployment may have introduced regression"

Update (10 minutes):
"🚨 SEV-1: Rolling back to previous version"

Resolution (15 minutes):
"✅ SEV-1: Issue resolved. Rolling back completed. Error rate normal."

Postmortem (Next day):
"📋 Postmortem: Code review process updated to catch regression"
```

### 6. Resolution & Verification

```bash
# Verify error rate back to normal
curl https://monitoring.kodo.com/api/metrics/error-rate

# Verify response time normal
curl https://monitoring.kodo.com/api/metrics/response-time

# Verify no ongoing errors
tail -20 logs/error.log | grep "ERROR"

# Run quick smoke tests
npm run test:integration -- critical-flows.integration.test.js --testNamePattern="Buyer"
```

### 7. Post-Incident

**Immediate (Within 1 hour)**
- Create incident report
- Assign investigation tasks
- Schedule postmortem

**Short-term (Within 24 hours)**
- Complete investigation
- Identify root cause
- Implement fix
- Deploy fix to production

**Long-term (Within 1 week)**
- Document lessons learned
- Update runbook if needed
- Implement monitoring improvements
- Share with team

---

## Maintenance Procedures

### Daily Tasks (Automated)

```bash
# Database backup (cron: 02:00 UTC)
0 2 * * * /usr/local/bin/backup-db.sh

# Log rotation (cron: 00:00 UTC)
0 0 * * * /usr/local/sbin/logrotate /etc/logrotate.d/kodo

# Cache cleanup (cron: 03:00 UTC)
0 3 * * * redis-cli FLUSHDB
```

### Weekly Tasks

**Monday 09:00 UTC:**
```bash
# Database maintenance
psql kodo_prod -c "VACUUM ANALYZE;"

# Check backup integrity
./scripts/verify-backups.sh

# Review performance metrics
curl https://monitoring.kodo.com/api/metrics/weekly-report
```

**Friday 17:00 UTC:**
```bash
# Security updates check
apt update && apt list --upgradable

# Database replication status (if replicated)
./scripts/check-replication.sh
```

### Monthly Tasks

**1st of Month:**
```bash
# Full system audit
./scripts/system-audit.sh

# Review and update runbook
# Review and update monitoring
# Review and update security rules
# Review and update backup strategy
```

### Quarterly Tasks (Every 3 months)

**Q1, Q2, Q3, Q4:**
```bash
# Disaster recovery drill
./scripts/dr-drill.sh

# Security assessment
./scripts/security-scan.sh

# Performance analysis
npm run perf:check && npm run test:integration

# Dependency updates
npm update
git commit -m "deps: quarterly security updates"
```

---

## Scaling & Performance

### Horizontal Scaling

**Add More API Servers**
```bash
# Kubernetes
kubectl scale deployment kodo --replicas=5

# Docker Compose (need to add service instances)
docker-compose up -d --scale api=5
```

**Add Database Read Replicas**
```bash
# Create read replica
aws rds create-db-instance-read-replica \
  --db-instance-identifier kodo-prod-read-1 \
  --source-db-instance-identifier kodo-prod

# Configure connection routing
# Update DATABASE_READ_URL to point to replica
```

**Add Redis Cluster**
```bash
# Create Redis cluster for better throughput
redis-cli cluster create 127.0.0.1:7000 ... 127.0.0.1:7005
```

### Vertical Scaling

```bash
# Increase server resources (after monitoring shows saturation)
# 1. Request larger instance from cloud provider
# 2. Migrate database to larger instance
# 3. Test thoroughly
# 4. Verify performance improvement
```

### Performance Tuning

**Database Tuning**
```sql
-- Increase work_mem for complex queries
ALTER DATABASE kodo_prod SET work_mem = '256MB';

-- Increase effective_cache_size
ALTER DATABASE kodo_prod SET effective_cache_size = '4GB';

-- Increase connection pool
ALTER SYSTEM SET max_connections = 500;
SELECT pg_reload_conf();
```

**Redis Tuning**
```bash
# Increase max memory
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

---

## Emergency Procedures

### Service Completely Down

```bash
# 1. Alert team immediately
slack_message "🚨 CRITICAL: Service completely down"

# 2. Check infrastructure
ping api.kodo.com
systemctl status docker

# 3. Check containerization
docker-compose ps
kubectl get pods

# 4. Check logs
tail -100 /var/log/docker.log
journalctl -xe

# 5. Restart services
docker-compose restart
kubectl rollout restart deployment/kodo

# 6. If still down, check infrastructure
# - Is server up?
# - Is network accessible?
# - Is database accessible?

# 7. Last resort: Restore from backup
./scripts/rollback.sh latest

# 8. If backup failed: Manual restoration
# Contact cloud provider for previous snapshots
```

### Data Corruption

```bash
# 1. Immediately notify team
slack_message "🚨 CRITICAL: Data corruption detected"

# 2. Stop writes (make database read-only)
psql kodo_prod -c "ALTER DATABASE kodo_prod SET default_transaction_access_mode = READ ONLY;"

# 3. Restore from backup
./scripts/restore-backup.sh backup_20260804_020000.sql.gz

# 4. Verify data integrity
npm run db:verify

# 5. Resume normal operations
psql kodo_prod -c "ALTER DATABASE kodo_prod SET default_transaction_access_mode = READ WRITE;"

# 6. Investigate root cause
# Check logs for what corrupted data
# Implement prevention measures
```

### DDoS Attack

```bash
# 1. Alert infrastructure team
slack_message "🚨 CRITICAL: DDoS attack detected"

# 2. Enable rate limiting (already configured in Nginx)
# Update rate limit thresholds aggressively
curl http://localhost/admin/rate-limits -X POST -d '{"requests_per_minute": 10}'

# 3. Enable CloudFlare/CDN firewall rules
open https://dash.cloudflare.com/kodo/security/firewall

# 4. Block suspicious IPs
iptables -I INPUT -s <attacker-ip> -j DROP

# 5. Scale infrastructure to absorb attack
kubectl scale deployment kodo --replicas=20

# 6. Work with cloud provider on attack mitigation
# They may have DDoS protection services
```

### Security Breach

```bash
# 1. Isolate affected systems
# Stop all services except monitoring

# 2. Preserve evidence
# Copy logs, memory dumps, disk snapshots

# 3. Notify security team
slack_message "🚨 CRITICAL: Security breach detected - Do not commit/push anything"

# 4. Investigate:
# - What was accessed?
# - How did they get in?
# - When did it happen?
# - Is the breach ongoing?

# 5. Contain breach
# Reset all passwords
# Revoke compromised tokens
# Update firewall rules

# 6. Restore from known-good backup
./scripts/restore-backup.sh backup_before_breach.sql.gz

# 7. Deploy security patches
git checkout security-patch-branch
./scripts/deploy.sh production

# 8. Notify affected users
# Email: "Your account password needs to be reset"

# 9. Postmortem and improvements
# Security audit
# Penetration testing
# Update security policies
```

---

## Contacts & Escalation

### On-Call Rotation

```
Primary On-Call Engineer:    [NAME] ([EMAIL], [PHONE])
Secondary On-Call Engineer:  [NAME] ([EMAIL], [PHONE])
Escalation (CTO):           [NAME] ([EMAIL], [PHONE])
Escalation (CEO):           [NAME] ([EMAIL], [PHONE])
```

### External Contacts

```
Cloud Provider Support:     [TICKET SYSTEM]
Database Provider Support:  [CONTACT INFO]
CDN Support:               [CONTACT INFO]
Security Incident Team:    [EMAIL]
```

### Communication Channels

```
⚠️  SEV-1 (Critical):       Phone + Slack + Status Page
⚠️  SEV-2 (High):          Slack + Email + Status Page
⚠️  SEV-3 (Medium):        Slack + Status Page
📋 SEV-4 (Low):            Email + Ticket
```

### Status Page Updates

```
Status Page: https://status.kodo.com

Update frequency:
- During incident: Every 5 minutes
- Post-incident: Every 30 minutes until resolved
- After resolution: Final postmortem in 24 hours
```

---

## Quick Reference Commands

```bash
# Start/Stop Services
docker-compose up -d
docker-compose down
kubectl rollout status deployment/kodo

# Check Health
curl https://api.kodo.com/health
curl https://api.kodo.com/api/health/db

# View Logs
tail -f logs/production.log
kubectl logs -f deployment/kodo

# Database Backup
npm run db:backup
./scripts/backup-db.sh

# Database Restore
./scripts/restore-backup.sh backup_file.sql.gz

# Rollback Deployment
./scripts/rollback.sh latest

# Performance Check
npm run perf:check

# Run Tests
npm run test:integration -- critical-flows.integration.test.js

# Monitor Dashboard
open https://monitoring.kodo.com
```

---

## Success Criteria

✅ **Production Ready When:**

1. **Deployment**
   - Zero-downtime deployment tested
   - Rollback procedure verified
   - All tests passing

2. **Monitoring**
   - All alerts configured
   - Dashboard displaying metrics
   - Notifications working

3. **Incidents**
   - Incident response plan tested
   - On-call rotation established
   - Escalation procedures clear

4. **Maintenance**
   - Backup procedures automated
   - Database maintenance scheduled
   - Security updates planned

5. **Performance**
   - All targets met
   - Load testing passed
   - Performance baseline established

