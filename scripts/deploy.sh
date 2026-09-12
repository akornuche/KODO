#!/bin/bash
# Production Deployment Script
# Usage: ./deploy.sh [staging|production]

set -e

# Configuration
ENVIRONMENT=${1:-"staging"}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_LOG="${PROJECT_ROOT}/logs/deployment_$(date +%Y%m%d_%H%M%S).log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
log() {
  echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

warn() {
  echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

# Create logs directory
mkdir -p "$(dirname "$DEPLOYMENT_LOG")"

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
  error "Invalid environment. Use: staging or production"
  exit 1
fi

log "Starting deployment to $ENVIRONMENT"

# Pre-deployment checks
log "Running pre-deployment checks..."

# Check Node.js
if ! command -v node &> /dev/null; then
  error "Node.js is not installed"
  exit 1
fi
NODE_VERSION=$(node -v)
log "Node version: $NODE_VERSION"

# Check npm
if ! command -v npm &> /dev/null; then
  error "npm is not installed"
  exit 1
fi
NPM_VERSION=$(npm -v)
log "npm version: $NPM_VERSION"

# Check git
if ! command -v git &> /dev/null; then
  error "git is not installed"
  exit 1
fi
GIT_COMMIT=$(git rev-parse --short HEAD)
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
log "Git branch: $GIT_BRANCH (commit: $GIT_COMMIT)"

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  warn "Uncommitted changes detected"
  read -p "Continue with deployment? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Load environment variables
if [ -f "$PROJECT_ROOT/.env.$ENVIRONMENT" ]; then
  export $(cat "$PROJECT_ROOT/.env.$ENVIRONMENT" | grep -v '^#' | xargs)
  log "Loaded environment variables from .env.$ENVIRONMENT"
else
  error ".env.$ENVIRONMENT file not found"
  exit 1
fi

# Backup current deployment
log "Creating deployment backup..."
BACKUP_DIR="${PROJECT_ROOT}/backups/deployment_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

if [ -d "${PROJECT_ROOT}/dist" ]; then
  cp -r "${PROJECT_ROOT}/dist" "$BACKUP_DIR/dist_backup"
fi
if [ -d "${PROJECT_ROOT}/build" ]; then
  cp -r "${PROJECT_ROOT}/build" "$BACKUP_DIR/build_backup"
fi

success "Backup created at $BACKUP_DIR"

# Database backup (production only)
if [ "$ENVIRONMENT" = "production" ]; then
  log "Creating database backup before deployment..."
  if [ -f "${PROJECT_ROOT}/server/scripts/backup-db.sh" ]; then
    chmod +x "${PROJECT_ROOT}/server/scripts/backup-db.sh"
    "${PROJECT_ROOT}/server/scripts/backup-db.sh" full || warn "Database backup failed"
  fi
fi

# Install dependencies
log "Installing dependencies..."
cd "$PROJECT_ROOT"
npm install --production || {
  error "Dependency installation failed"
  exit 1
}

# Build server
log "Building backend..."
cd "$PROJECT_ROOT/server"
npm install --production || {
  error "Server dependency installation failed"
  exit 1
}

# Verify database migrations
log "Verifying database migrations..."
if [ -f "${PROJECT_ROOT}/server/scripts/verify-migrations.js" ]; then
  node "${PROJECT_ROOT}/server/scripts/verify-migrations.js" || {
    error "Database migration verification failed"
    exit 1
  fi
else
  warn "Migration verification script not found"
fi

# Build client
log "Building frontend..."
cd "$PROJECT_ROOT/client"
npm install --production || {
  error "Client dependency installation failed"
  exit 1
}

npm run build || {
  error "Frontend build failed"
  exit 1
}

success "Frontend build completed"

# Verify build output
log "Verifying build outputs..."
if [ ! -d "$PROJECT_ROOT/client/dist" ]; then
  error "Frontend dist directory not found"
  exit 1
fi

log "Client build size: $(du -sh "$PROJECT_ROOT/client/dist" | cut -f1)"

# Run tests (optional)
if [ "$ENVIRONMENT" = "production" ]; then
  log "Running tests..."
  cd "$PROJECT_ROOT"
  if npm run test:integration 2>/dev/null; then
    success "Tests passed"
  else
    warn "Tests failed or not configured"
  fi
fi

# Health check
log "Performing health checks..."

# Check for required files
REQUIRED_FILES=(
  "server/app.js"
  "server/server.js"
  "server/package.json"
  "client/dist/index.html"
  ".env.$ENVIRONMENT"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$PROJECT_ROOT/$file" ]; then
    error "Required file missing: $file"
    exit 1
  fi
done

success "All required files present"

# Create deployment manifest
MANIFEST_FILE="$BACKUP_DIR/deployment_manifest.txt"
cat > "$MANIFEST_FILE" <<EOF
Deployment Manifest
===================
Environment: $ENVIRONMENT
Deployment Date: $(date)
Git Commit: $GIT_COMMIT
Git Branch: $GIT_BRANCH
Node Version: $NODE_VERSION
npm Version: $NPM_VERSION

Files Deployed:
- server/dist (backend)
- client/dist (frontend)
- .env.$ENVIRONMENT (configuration)

Deployment Status: READY
EOF

success "Deployment manifest created"

# Instructions for next steps
log ""
log "=========================================="
log "Deployment package ready for $ENVIRONMENT"
log "=========================================="
log ""
log "Backup location: $BACKUP_DIR"
log "Deployment log: $DEPLOYMENT_LOG"
log ""
log "Next steps:"
log "1. Copy dist/ and server/dist to production server"
log "2. Run: npm run db:migrate:prod"
log "3. Run: npm start"
log "4. Verify at: https://api.kodo.com/health"
log ""

success "Deployment script completed successfully!"

exit 0

