#!/bin/bash
# Deployment Rollback Script
# Usage: ./rollback.sh [backup_id]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_BASE="${PROJECT_ROOT}/backups"
ROLLBACK_LOG="${PROJECT_ROOT}/logs/rollback_$(date +%Y%m%d_%H%M%S).log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
log() {
  echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$ROLLBACK_LOG"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1" | tee -a "$ROLLBACK_LOG"
}

success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$ROLLBACK_LOG"
}

warn() {
  echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$ROLLBACK_LOG"
}

# Create logs directory
mkdir -p "$(dirname "$ROLLBACK_LOG")"

log "Starting rollback process..."

# List available backups if no backup_id provided
if [ -z "$1" ]; then
  log "Available backups:"
  ls -dt "$BACKUP_BASE"/deployment_* 2>/dev/null | head -5 | while read backup; do
    echo "  $(basename "$backup")"
  done
  
  read -p "Enter backup ID to restore (or 'latest'): " BACKUP_ID
  if [ "$BACKUP_ID" = "latest" ]; then
    BACKUP_ID=$(ls -dt "$BACKUP_BASE"/deployment_* 2>/dev/null | head -1 | xargs basename)
  fi
else
  BACKUP_ID=$1
fi

BACKUP_DIR="$BACKUP_BASE/$BACKUP_ID"

# Validate backup exists
if [ ! -d "$BACKUP_DIR" ]; then
  error "Backup not found: $BACKUP_DIR"
  exit 1
fi

log "Rolling back to: $BACKUP_ID"

# Confirm rollback
read -p "WARNING: This will revert to previous deployment. Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  error "Rollback cancelled"
  exit 1
fi

# Stop application
log "Stopping application..."
if command -v systemctl &> /dev/null; then
  systemctl stop kodo-server || warn "Could not stop via systemctl"
elif command -v pm2 &> /dev/null; then
  pm2 stop kodo || warn "Could not stop via pm2"
fi

# Backup current state before rollback
log "Creating pre-rollback backup..."
CURRENT_BACKUP="$BACKUP_BASE/pre_rollback_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$CURRENT_BACKUP"

if [ -d "$PROJECT_ROOT/dist" ]; then
  cp -r "$PROJECT_ROOT/dist" "$CURRENT_BACKUP/dist_backup"
fi
if [ -d "$PROJECT_ROOT/build" ]; then
  cp -r "$PROJECT_ROOT/build" "$CURRENT_BACKUP/build_backup"
fi

success "Pre-rollback backup created at $CURRENT_BACKUP"

# Restore from backup
log "Restoring files from backup..."

if [ -d "$BACKUP_DIR/dist_backup" ]; then
  log "Restoring frontend (dist)..."
  rm -rf "$PROJECT_ROOT/dist"
  cp -r "$BACKUP_DIR/dist_backup" "$PROJECT_ROOT/dist"
  success "Frontend restored"
fi

if [ -d "$BACKUP_DIR/build_backup" ]; then
  log "Restoring backend (build)..."
  rm -rf "$PROJECT_ROOT/build"
  cp -r "$BACKUP_DIR/build_backup" "$PROJECT_ROOT/build"
  success "Backend restored"
fi

# Verify restored files
log "Verifying restored files..."

REQUIRED_FILES=(
  "dist/index.html"
  "package.json"
  "server/package.json"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$PROJECT_ROOT/$file" ]; then
    error "Required file missing after restore: $file"
    exit 1
  fi
done

success "All required files verified"

# Database rollback (if needed)
if [ -f "$BACKUP_DIR/db_backup.sql" ]; then
  log "Database backup found. Restore? (y/n) "
  read -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "Restoring database..."
    if [ -n "$DATABASE_URL" ]; then
      gunzip -c "$BACKUP_DIR/db_backup.sql.gz" | psql "$DATABASE_URL"
      success "Database restored"
    else
      warn "DATABASE_URL not set, skipping database restore"
    fi
  fi
fi

# Restart application
log "Restarting application..."
if command -v systemctl &> /dev/null; then
  systemctl start kodo-server || {
    error "Failed to start application"
    exit 1
  }
elif command -v pm2 &> /dev/null; then
  pm2 start kodo || {
    error "Failed to start application"
    exit 1
  }
fi

# Wait for application to start
log "Waiting for application to start..."
sleep 5

# Health check
log "Performing health check..."
MAX_ATTEMPTS=10
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  if curl -s http://localhost:3000/health > /dev/null; then
    success "Application is healthy"
    break
  fi
  ATTEMPT=$((ATTEMPT + 1))
  if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
    log "Waiting for application... (attempt $ATTEMPT/$MAX_ATTEMPTS)"
    sleep 2
  fi
done

if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
  error "Application failed to start after rollback"
  exit 1
fi

# Summary
log ""
log "=========================================="
log "Rollback completed successfully!"
log "=========================================="
log ""
log "Restored backup: $BACKUP_ID"
log "Pre-rollback backup: $CURRENT_BACKUP"
log "Rollback log: $ROLLBACK_LOG"
log ""

success "System is running previous version"

exit 0

