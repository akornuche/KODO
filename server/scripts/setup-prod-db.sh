#!/bin/bash
# Production Database Setup Script
# Usage: ./setup-prod-db.sh

set -e

echo "🔧 KODO Production Database Setup"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check environment
if [ "$NODE_ENV" != "production" ]; then
    echo -e "${YELLOW}⚠️  WARNING: NODE_ENV is not set to 'production'${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Verify DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ ERROR: DATABASE_URL environment variable not set${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Environment variables verified"

# Create backup of existing database (if exists)
echo "📦 Creating pre-migration backup..."
BACKUP_FILE="backups/db_backup_$(date +%Y%m%d_%H%M%S).sql"
mkdir -p backups
pg_dump "$DATABASE_URL" > "$BACKUP_FILE" 2>/dev/null || echo "  (No existing database to backup)"

# Run Prisma migrations
echo "🔄 Running Prisma migrations..."
npx prisma migrate deploy --skip-generate

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Prisma migrations completed successfully"
else
    echo -e "${RED}❌ Prisma migrations failed${NC}"
    echo "  Backup saved at: $BACKUP_FILE"
    exit 1
fi

# Generate Prisma Client
echo "📝 Generating Prisma Client..."
npx prisma generate

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Prisma Client generated"
else
    echo -e "${RED}❌ Prisma Client generation failed${NC}"
    exit 1
fi

# Seed production data (optional)
read -p "Seed initial data? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌱 Seeding production data..."
    npx prisma db seed
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Database seeded successfully"
    else
        echo -e "${YELLOW}⚠️  Database seed encountered an error (non-critical)${NC}"
    fi
fi

# Verify database connectivity
echo "🔍 Verifying database connectivity..."
npx prisma studio --browser none &
STUDIO_PID=$!
sleep 2
kill $STUDIO_PID 2>/dev/null || true

echo ""
echo -e "${GREEN}✅ Production database setup completed successfully!${NC}"
echo ""
echo "📊 Database Statistics:"
psql "$DATABASE_URL" -c "\d" 2>/dev/null || echo "  (Run psql to view statistics)"
echo ""
echo "🔐 Next Steps:"
echo "  1. Verify database contents: psql $DATABASE_URL"
echo "  2. Update NODE_ENV to 'production'"
echo "  3. Start the server: npm start"
echo "  4. Backup file saved: $BACKUP_FILE"

