#!/bin/bash
# Automated Database Backup Script
# Usage: ./backup-db.sh [full|incremental]
# Schedule with cron: 0 2 * * * /path/to/backup-db.sh full

set -e

# Configuration
BACKUP_TYPE=${1:-"full"}
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS=${RETENTION_DAYS:-30}
COMPRESSION=${COMPRESSION:-true}
DB_URL="${DATABASE_URL}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log() {
  echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

log "Starting database backup (Type: $BACKUP_TYPE)"

# Determine backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/kodo_db_${BACKUP_TYPE}_${TIMESTAMP}.sql"

# Extract database connection info
if [[ $DB_URL == postgresql:* ]]; then
  # PostgreSQL backup
  log "Detected PostgreSQL database"
  
  # Parse connection string
  DB_NAME=$(echo "$DB_URL" | sed -E 's|.*/@([^:/?]+).*|\1|' || echo "kodo_prod")
  DB_HOST=$(echo "$DB_URL" | sed -E 's|.*@([^:/]+).*|\1|' || echo "localhost")
  DB_USER=$(echo "$DB_URL" | sed -E 's|postgresql://([^:]+).*|\1|' || echo "postgres")
  DB_PORT=$(echo "$DB_URL" | sed -E 's|.*:([0-9]+).*|\1|' || echo "5432")
  
  log "Database: $DB_NAME on $DB_HOST:$DB_PORT"
  
  # Create backup
  if PGPASSWORD=$(echo "$DB_URL" | sed -E 's|.*:([^@]+)@.*|\1|') \
     pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"; then
    success "Backup created: $BACKUP_FILE"
  else
    error "Failed to create PostgreSQL backup"
    exit 1
  fi
  
elif [[ $DB_URL == file:* ]]; then
  # SQLite backup
  log "Detected SQLite database"
  
  DB_FILE=$(echo "$DB_URL" | sed -E 's|file:\./||')
  
  if [ -f "$DB_FILE" ]; then
    cp "$DB_FILE" "$BACKUP_FILE"
    success "Backup created: $BACKUP_FILE"
  else
    error "SQLite database file not found: $DB_FILE"
    exit 1
  fi
else
  error "Unsupported database URL: $DB_URL"
  exit 1
fi

# Compression
if [ "$COMPRESSION" = true ]; then
  log "Compressing backup..."
  
  if gzip "$BACKUP_FILE"; then
    BACKUP_FILE="${BACKUP_FILE}.gz"
    success "Backup compressed"
  else
    warn "Compression failed, keeping uncompressed"
  fi
fi

# Get backup size
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log "Backup size: $SIZE"

# Cleanup old backups
log "Cleaning up backups older than $RETENTION_DAYS days..."

DELETED_COUNT=0
while IFS= read -r old_backup; do
  rm -f "$old_backup"
  DELETED_COUNT=$((DELETED_COUNT + 1))
done < <(find "$BACKUP_DIR" -name "kodo_db_*.sql*" -mtime "+$RETENTION_DAYS")

if [ $DELETED_COUNT -gt 0 ]; then
  log "Deleted $DELETED_COUNT old backup(s)"
fi

# Verify backup integrity
log "Verifying backup integrity..."

if [[ $BACKUP_FILE == *.gz ]]; then
  if gzip -t "$BACKUP_FILE" 2>/dev/null; then
    success "Backup integrity verified"
  else
    error "Backup file is corrupted!"
    exit 1
  fi
else
  # For SQL files, check if readable
  if [ -r "$BACKUP_FILE" ]; then
    success "Backup file is readable"
  else
    error "Backup file is not readable"
    exit 1
  fi
fi

# Log backup metadata
cat >> "$BACKUP_DIR/.backup_log" <<EOF
Date: $(date +'%Y-%m-%d %H:%M:%S')
Type: $BACKUP_TYPE
File: $(basename "$BACKUP_FILE")
Size: $SIZE
Status: SUCCESS
EOF

success "Backup completed successfully!"

# Optional: Upload to cloud storage
if [ -n "$BACKUP_STORAGE_URL" ]; then
  log "Uploading backup to cloud storage..."
  
  if command -v aws &> /dev/null; then
    aws s3 cp "$BACKUP_FILE" "$BACKUP_STORAGE_URL/$(basename "$BACKUP_FILE")"
    success "Backup uploaded to S3"
  elif command -v gsutil &> /dev/null; then
    gsutil cp "$BACKUP_FILE" "$BACKUP_STORAGE_URL/$(basename "$BACKUP_FILE")"
    success "Backup uploaded to Google Cloud Storage"
  fi
fi

exit 0

