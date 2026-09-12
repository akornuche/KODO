# Database Backup & Disaster Recovery Strategy

## Overview
Comprehensive backup strategy for production KODO database with automated scheduling, cloud storage, and recovery procedures.

---

## 1. Backup Schedule

### Daily Backups (Recommended)
```bash
# Cron job (Linux/Mac)
0 2 * * * /path/to/kodo/scripts/backup-db.sh full

# Scheduled Task (Windows)
# Run at 2:00 AM daily
schtasks /create /tn "KODO-DB-Backup" /tr "powershell.exe -File C:\kodo\scripts\backup-db.ps1 -Type full" /sc daily /st 02:00
```

### Backup Retention Policy
```
Daily Backups:     Keep for 30 days
Weekly Backups:    Keep for 3 months
Monthly Backups:   Keep for 1 year
```

### Backup Verification
```bash
# Weekly backup integrity check
0 3 * * 0 /path/to/kodo/scripts/verify-backup.sh

# Monthly test restore
0 4 1 * * /path/to/kodo/scripts/test-restore.sh
```

---

## 2. Backup Types

### Full Backup
- Complete database dump
- Size: ~50-200MB (depending on data)
- Frequency: Daily
- Restoration time: ~5-10 minutes

```bash
./scripts/backup-db.sh full
```

### Incremental Backup (PostgreSQL only)
- Only changes since last backup
- Size: 5-20MB
- Frequency: Every 6 hours
- Restoration: Full + all incremental backups

```bash
./scripts/backup-db.sh incremental
```

### Transaction Log Archiving (PostgreSQL)
```bash
# Enable WAL archiving in postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /backups/wal_archive/%f'
```

---

## 3. Cloud Storage Integration

### Amazon S3
```bash
# Install AWS CLI
brew install awscli

# Configure credentials
aws configure

# Upload backup to S3
aws s3 cp ./backups/kodo_db_full_20260820_020000.sql.gz s3://kodo-backups/
```

#### S3 Lifecycle Policy (Auto-delete old backups)
```json
{
  "Rules": [
    {
      "Id": "DeleteOldBackups",
      "Status": "Enabled",
      "Prefix": "kodo_db_full_",
      "Expiration": {
        "Days": 30
      }
    }
  ]
}
```

### Google Cloud Storage
```bash
# Install gsutil
curl https://sdk.cloud.google.com | bash

# Configure
gcloud config set project YOUR_PROJECT_ID

# Upload
gsutil cp ./backups/kodo_db_full_*.sql.gz gs://kodo-backups/
```

### Azure Blob Storage
```bash
# Install Azure CLI
brew install azure-cli

# Login
az login

# Upload
az storage blob upload --account-name kodo --container-name backups --name backup.sql.gz --file ./backups/backup.sql.gz
```

---

## 4. Backup Configuration

### Environment Variables
```bash
# .env.production
BACKUP_ENABLED=true
BACKUP_DIR=/var/backups/kodo
BACKUP_RETENTION_DAYS=30
BACKUP_COMPRESSION=true
BACKUP_CLOUD_STORAGE=s3://kodo-backups
BACKUP_SCHEDULE="0 2 * * *"  # Daily at 2 AM
```

### Backup Script Usage
```bash
# Linux/Mac
chmod +x scripts/backup-db.sh

# Full backup
./scripts/backup-db.sh full

# Incremental backup (PostgreSQL)
./scripts/backup-db.sh incremental

# With custom retention
RETENTION_DAYS=60 ./scripts/backup-db.sh full

# With custom backup directory
BACKUP_DIR=/mnt/backup-storage ./scripts/backup-db.sh full

# Windows PowerShell
.\scripts\backup-db.ps1 -Type full -RetentionDays 30
```

---

## 5. Backup Verification

### Check Backup Integrity
```bash
# Verify compressed file
gzip -t backups/kodo_db_full_*.sql.gz

# Verify SQL file
head -10 backups/kodo_db_full_*.sql
```

### Test Restore Process
```bash
# Create test database
createdb kodo_test

# Restore from backup
gunzip -c backups/kodo_db_full_*.sql.gz | psql kodo_test

# Verify data
psql kodo_test -c "SELECT COUNT(*) FROM users;"

# Cleanup test database
dropdb kodo_test
```

### Backup Monitoring Script
```bash
#!/bin/bash
# Check if today's backup exists

BACKUP_FILE="backups/kodo_db_full_$(date +%Y%m%d)_*.sql.gz"

if ls $BACKUP_FILE 1> /dev/null 2>&1; then
    echo "✓ Backup exists for today"
    ls -lh $BACKUP_FILE
else
    echo "✗ No backup found for today!"
    exit 1
fi
```

---

## 6. Disaster Recovery Procedures

### Scenario 1: Accidental Data Deletion
**Recovery Time: 5-10 minutes**

```bash
# 1. Create recovery database
createdb kodo_recovery

# 2. Restore from most recent backup
gunzip -c backups/kodo_db_full_latest.sql.gz | psql kodo_recovery

# 3. Verify restored data
psql kodo_recovery -c "SELECT COUNT(*) FROM orders;"

# 4. If verified, restore to production
# Backup current database first
./scripts/backup-db.sh full

# 5. Restore data
gunzip -c backups/kodo_db_full_latest.sql.gz | psql kodo

# 6. Verify production
psql kodo -c "SELECT COUNT(*) FROM orders;"
```

### Scenario 2: Corrupted Database
**Recovery Time: 10-20 minutes**

```bash
# 1. Stop application
systemctl stop kodo-server

# 2. Backup corrupted database (for investigation)
cp /var/lib/postgresql/kodo /backups/kodo_corrupted_$(date +%s)

# 3. Create new database
createdb kodo_restored

# 4. Restore from backup
gunzip -c backups/kodo_db_full_latest.sql.gz | psql kodo_restored

# 5. Verify restored data
psql kodo_restored -c "\dt"  # List tables

# 6. Rename databases
psql -c "ALTER DATABASE kodo RENAME TO kodo_broken;"
psql -c "ALTER DATABASE kodo_restored RENAME TO kodo;"

# 7. Start application
systemctl start kodo-server
```

### Scenario 3: Complete Database Loss
**Recovery Time: 20-30 minutes**

```bash
# 1. Obtain backup from cloud storage
aws s3 cp s3://kodo-backups/kodo_db_full_*.sql.gz ./

# 2. Decompress
gunzip kodo_db_full_*.sql.gz

# 3. Create empty database
createdb kodo

# 4. Restore all data
psql kodo < kodo_db_full_*.sql

# 5. Verify all tables
psql kodo -c "SELECT tablename FROM pg_tables WHERE schemaname='public';"

# 6. Run migrations (if needed)
npm run db:migrate:prod

# 7. Start application
npm start
```

### Scenario 4: Point-in-Time Recovery (PostgreSQL)
**For recovering data from a specific time**

```bash
# 1. Restore to new database from full backup
psql kodo_pitr < kodo_db_full_backup.sql

# 2. Replay transaction logs up to target time
pg_ctl -D /var/lib/postgresql/kodo_pitr -o "-c recovery_target_time='2026-08-20 10:30:00'" start

# 3. Promote to read-write
pg_ctl promote -D /var/lib/postgresql/kodo_pitr

# 4. If correct, make it production
# ... follow steps from Scenario 2
```

---

## 7. Backup Checklist

### Weekly Backup Verification
- [ ] Check latest backup file exists
- [ ] Verify backup size is reasonable
- [ ] Test decompress backup file
- [ ] Review backup logs for errors
- [ ] Confirm cloud storage upload

### Monthly Backup Review
- [ ] Test full restore procedure
- [ ] Verify data integrity after restore
- [ ] Check retention policy compliance
- [ ] Review backup storage space usage
- [ ] Update disaster recovery runbook

### Quarterly Disaster Recovery Drill
- [ ] Simulate complete database loss
- [ ] Practice recovery procedure
- [ ] Measure recovery time (RTO)
- [ ] Verify recovered data accuracy (RPO)
- [ ] Document lessons learned

---

## 8. RTO & RPO Targets

### Recovery Time Objective (RTO)
- **Target**: < 30 minutes
- Full restoration from backup: 10-20 min
- Application startup: 5-10 min
- Verification: 5-10 min

### Recovery Point Objective (RPO)
- **Target**: < 24 hours of data loss acceptable
- Daily backups: 24-hour maximum loss
- Hourly backups (incremental): 1-hour maximum loss

### SLA Commitments
```
Backup Status Dashboard:
- Last backup: 2 hours ago ✓
- Next scheduled backup: In 12 hours
- Backup integrity: VERIFIED ✓
- Last restore test: 7 days ago ✓
```

---

## 9. Backup Cost Optimization

### Storage Sizing
```
Daily full backup:       ~100 MB
Monthly backups:         30 × 100 MB = 3 GB
S3 storage cost:         ~$0.05/GB/month = $0.15/month
```

### Cost Reduction Strategies
1. **Compression**: 70-80% size reduction (~$0.03-0.05/month)
2. **Incremental backups**: Only changes (~20% size of full)
3. **Lifecycle policies**: Delete old backups automatically
4. **Local backups**: Store monthly/yearly locally (cheaper)

### Estimated Annual Cost
```
S3 Storage:           $2-5/year
Backup script:        Free (open source)
Monitoring:           $10-20/year (optional)
---
Total:                ~$15-30/year
```

---

## 10. Automated Backup Monitoring

### Nagios/Icinga Alert
```bash
#!/bin/bash
# Check if backup completed in last 24 hours

BACKUP_FILE=$(ls -t backups/kodo_db_full_*.sql.gz 2>/dev/null | head -1)

if [ -z "$BACKUP_FILE" ]; then
    echo "CRITICAL - No backup found"
    exit 2
fi

# Check file modification time
MOD_TIME=$(stat -f %m "$BACKUP_FILE" 2>/dev/null || stat -c %Y "$BACKUP_FILE")
CURRENT_TIME=$(date +%s)
DIFF=$((CURRENT_TIME - MOD_TIME))
ONE_DAY=$((24 * 3600))

if [ $DIFF -gt $ONE_DAY ]; then
    echo "WARNING - Backup older than 24 hours"
    exit 1
fi

echo "OK - Backup completed within 24 hours"
exit 0
```

### Prometheus Metrics
```bash
# Expose metrics for Prometheus scraping
node_backup_size_bytes{backup_type="full"} 102400000
node_backup_timestamp_seconds{backup_type="full"} 1692518400
node_backup_status{backup_type="full"} 1  # 1 = success, 0 = failure
```

---

## 11. Production Checklist

- [ ] Backup script tested and working
- [ ] Cron job / Scheduled task configured
- [ ] Cloud storage account created
- [ ] Cloud storage credentials configured
- [ ] Backup retention policy set
- [ ] Monitoring alerts configured
- [ ] Restore procedure documented
- [ ] Disaster recovery team trained
- [ ] RTO/RPO targets defined
- [ ] Quarterly backup tests scheduled

