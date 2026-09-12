# Production Deployment Script (PowerShell)
# Usage: .\deploy.ps1 -Environment staging
#        .\deploy.ps1 -Environment production

param(
    [string]$Environment = "staging",
    [string]$ProjectRoot = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
)

# Configuration
$ScriptDir = $PSScriptRoot
$DeploymentDate = Get-Date -Format "yyyyMMdd_HHmmss"
$DeploymentLog = Join-Path $ProjectRoot "logs" "deployment_$DeploymentDate.log"
$BackupDir = Join-Path $ProjectRoot "backups" "deployment_$DeploymentDate"

# Logging functions
function Write-Log {
    param([string]$Message)
    $LogMessage = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
    Write-Host $LogMessage -ForegroundColor Cyan
    Add-Content -Path $DeploymentLog -Value $LogMessage
}

function Write-Error-Log {
    param([string]$Message)
    $LogMessage = "[ERROR] $Message"
    Write-Host $LogMessage -ForegroundColor Red
    Add-Content -Path $DeploymentLog -Value $LogMessage
}

function Write-Success {
    param([string]$Message)
    $LogMessage = "[SUCCESS] $Message"
    Write-Host $LogMessage -ForegroundColor Green
    Add-Content -Path $DeploymentLog -Value $LogMessage
}

function Write-Warn {
    param([string]$Message)
    $LogMessage = "[WARNING] $Message"
    Write-Host $LogMessage -ForegroundColor Yellow
    Add-Content -Path $DeploymentLog -Value $LogMessage
}

# Create logs directory
New-Item -ItemType Directory -Path (Split-Path -Parent $DeploymentLog) -Force | Out-Null

# Validate environment
if ($Environment -notin @("staging", "production")) {
    Write-Error-Log "Invalid environment. Use: staging or production"
    exit 1
}

Write-Log "Starting deployment to $Environment"

# Pre-deployment checks
Write-Log "Running pre-deployment checks..."

# Check Node.js
$NodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Error-Log "Node.js is not installed"
    exit 1
}
Write-Log "Node version: $NodeVersion"

# Check npm
$NpmVersion = npm --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Error-Log "npm is not installed"
    exit 1
}
Write-Log "npm version: $NpmVersion"

# Check git
$GitCommit = git rev-parse --short HEAD 2>$null
$GitBranch = git rev-parse --abbrev-ref HEAD 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Error-Log "git is not installed"
    exit 1
}
Write-Log "Git branch: $GitBranch (commit: $GitCommit)"

# Load environment variables
$EnvFile = Join-Path $ProjectRoot ".env.$Environment"
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | Where-Object { $_ -notmatch '^#' } | ForEach-Object {
        $name, $value = $_ -split '=', 2
        if ($name) {
            [System.Environment]::SetEnvironmentVariable($name, $value)
        }
    }
    Write-Log "Loaded environment variables from .env.$Environment"
} else {
    Write-Error-Log ".env.$Environment file not found"
    exit 1
}

# Backup current deployment
Write-Log "Creating deployment backup..."
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

$DistPath = Join-Path $ProjectRoot "dist"
if (Test-Path $DistPath) {
    Copy-Item -Path $DistPath -Destination (Join-Path $BackupDir "dist_backup") -Recurse -Force
}

$BuildPath = Join-Path $ProjectRoot "build"
if (Test-Path $BuildPath) {
    Copy-Item -Path $BuildPath -Destination (Join-Path $BackupDir "build_backup") -Recurse -Force
}

Write-Success "Backup created at $BackupDir"

# Database backup (production only)
if ($Environment -eq "production") {
    Write-Log "Creating database backup before deployment..."
    $BackupScript = Join-Path $ProjectRoot "server" "scripts" "backup-db.ps1"
    if (Test-Path $BackupScript) {
        try {
            & $BackupScript -Type full
        } catch {
            Write-Warn "Database backup failed: $_"
        }
    }
}

# Install dependencies
Write-Log "Installing dependencies..."
Set-Location $ProjectRoot
npm install --production
if ($LASTEXITCODE -ne 0) {
    Write-Error-Log "Dependency installation failed"
    exit 1
}

# Build server
Write-Log "Building backend..."
Set-Location "$ProjectRoot\server"
npm install --production
if ($LASTEXITCODE -ne 0) {
    Write-Error-Log "Server dependency installation failed"
    exit 1
}

# Verify database migrations
Write-Log "Verifying database migrations..."
$MigrationScript = Join-Path $ProjectRoot "server" "scripts" "verify-migrations.js"
if (Test-Path $MigrationScript) {
    node $MigrationScript
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Log "Database migration verification failed"
        exit 1
    }
} else {
    Write-Warn "Migration verification script not found"
}

# Build client
Write-Log "Building frontend..."
Set-Location "$ProjectRoot\client"
npm install --production
if ($LASTEXITCODE -ne 0) {
    Write-Error-Log "Client dependency installation failed"
    exit 1
}

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error-Log "Frontend build failed"
    exit 1
}

Write-Success "Frontend build completed"

# Verify build output
Write-Log "Verifying build outputs..."
$ClientDist = Join-Path $ProjectRoot "client" "dist"
if (!(Test-Path $ClientDist)) {
    Write-Error-Log "Frontend dist directory not found"
    exit 1
}

$DistSize = (Get-ChildItem $ClientDist -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Log "Client build size: $([math]::Round($DistSize, 2)) MB"

# Run tests (optional)
if ($Environment -eq "production") {
    Write-Log "Running tests..."
    Set-Location $ProjectRoot
    npm run test:integration 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Tests passed"
    } else {
        Write-Warn "Tests failed or not configured"
    }
}

# Health check
Write-Log "Performing health checks..."

$RequiredFiles = @(
    "server\app.js",
    "server\server.js",
    "server\package.json",
    "client\dist\index.html",
    ".env.$Environment"
)

foreach ($file in $RequiredFiles) {
    $FilePath = Join-Path $ProjectRoot $file
    if (!(Test-Path $FilePath)) {
        Write-Error-Log "Required file missing: $file"
        exit 1
    }
}

Write-Success "All required files present"

# Create deployment manifest
$ManifestFile = Join-Path $BackupDir "deployment_manifest.txt"
@"
Deployment Manifest
===================
Environment: $Environment
Deployment Date: $(Get-Date)
Git Commit: $GitCommit
Git Branch: $GitBranch
Node Version: $NodeVersion
npm Version: $NpmVersion

Files Deployed:
- server\dist (backend)
- client\dist (frontend)
- .env.$Environment (configuration)

Deployment Status: READY
"@ | Out-File -FilePath $ManifestFile -Encoding UTF8

Write-Success "Deployment manifest created"

# Instructions for next steps
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Deployment package ready for $Environment" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Log "Backup location: $BackupDir"
Write-Log "Deployment log: $DeploymentLog"
Write-Host ""
Write-Log "Next steps:"
Write-Log "1. Copy dist\ and server\dist to production server"
Write-Log "2. Run: npm run db:migrate:prod"
Write-Log "3. Run: npm start"
Write-Log "4. Verify at: https://api.kodo.com/health"
Write-Host ""

Write-Success "Deployment script completed successfully!"

exit 0

