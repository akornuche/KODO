# KODO Platform - Quick Start Script for Windows

Write-Host "🚀 Starting KODO Platform..." -ForegroundColor Green
Write-Host ""

# Check if Docker is running
$dockerRunning = docker info 2>&1 | Select-String "Server Version"
if (-not $dockerRunning) {
    Write-Host "❌ Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker is running" -ForegroundColor Green

# Start Docker Compose services
Write-Host ""
Write-Host "📦 Starting database services..." -ForegroundColor Cyan
docker-compose up -d postgres redis adminer

# Wait for PostgreSQL to be ready
Write-Host ""
Write-Host "⏳ Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$maxAttempts = 30
$attempt = 0
$ready = $false

while (-not $ready -and $attempt -lt $maxAttempts) {
    $attempt++
    $result = docker exec kodo_postgres pg_isready -U kodo_user -d kododb 2>&1
    if ($result -match "accepting connections") {
        $ready = $true
    } else {
        Write-Host "." -NoNewline
        Start-Sleep -Seconds 1
    }
}

if (-not $ready) {
    Write-Host ""
    Write-Host "❌ PostgreSQL failed to start within timeout" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ PostgreSQL is ready" -ForegroundColor Green

# Run Prisma migrations
Write-Host ""
Write-Host "🔄 Running database migrations..." -ForegroundColor Cyan
Set-Location server
npm run prisma:generate
npm run db:migrate

# Seed database
Write-Host ""
Write-Host "🌱 Seeding database with test data..." -ForegroundColor Cyan
npm run db:seed

# Start server
Write-Host ""
Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Services:" -ForegroundColor Cyan
Write-Host "   API Server:    http://localhost:4000" -ForegroundColor White
Write-Host "   Database UI:   http://localhost:8080" -ForegroundColor White
Write-Host "   PostgreSQL:    localhost:5432" -ForegroundColor White
Write-Host "   Redis:         localhost:6379" -ForegroundColor White
Write-Host ""
Write-Host "👤 Test Credentials (password for all: Password123!):" -ForegroundColor Cyan
Write-Host "   Admin:   admin@example.com" -ForegroundColor White
Write-Host "   Seller:  seller1@example.com" -ForegroundColor White
Write-Host "   Buyer:   buyer1@example.com" -ForegroundColor White
Write-Host "   Courier: courier1@example.com" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Starting development server..." -ForegroundColor Green
Write-Host ""
npm run dev
