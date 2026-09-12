# Deployment Rollback Script (PowerShell)
# Usage: .\rollback.ps1 -BackupId deployment_20260820_020000

param(
    [string]$BackupId = "",
    [string]$ProjectRoot = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
)

# Configuration
$BackupBase = Join-Path $ProjectRoot "backups"
$RollbackLog = Join-Path $ProjectRoot "logs" "rollback_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"

# Logging functions
function Write-Log {
    param([string]$Message)
    $LogMessage = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
    Write-Host $LogMessage -ForegroundColor Cyan
    Add-Content -Path $RollbackLog -Value $LogMessage
}

function Write-Error-Log {
    param([string]$Message)
    $LogMessage = "[ERROR] $Message"
    Write-Host $LogMessage -ForegroundColor Red
    Add-Content -Path $RollbackLog -Value $LogMessage
}

function Write-Success {
    param([string]$Message)
    $LogMessage = "[SUCCESS] $Message"
    Write-Host $LogMessage -ForegroundColor Green
    Add-Content -Path $RollbackLog -Value $LogMessage
}

function Write-Warn {
    param([string]$Message)
    $LogMessage = "[WARNING] $Message"
    Write-Host $LogMessage -ForegroundColor Yellow
    Add-Content -Path $RollbackLog -Value $LogMessage
}

# Create logs directory
New-Item -ItemType Directory -Path (Split-Path -Parent $RollbackLog) -Force | Out-Null

Write-Log "Starting rollback process..."

# List available backups if no backup_id provided
if ([string]::IsNullOrEmpty($BackupId)) {
    Write-Log "Available backups:"
    $Backups = Get-ChildItem $BackupBase -Directory -Filter "deployment_*" | Sort-Object LastWriteTime -Descending | Select-Object -First 5
    
    foreach ($backup in $Backups) {
        Write-Host "  $($backup.Name)"
    }
    
    $BackupId = Read-Host "Enter backup ID to restore (or 'latest')"
    
    if ($BackupId -eq "latest") {
        $BackupId = (Get-ChildItem $BackupBase -Directory -Filter "deployment_*" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).Name
    }
}

$BackupDir = Join-Path $BackupBase $BackupId

# Validate backup exists
if (!(Test-Path $BackupDir)) {
    Write-Error-Log "Backup not found: $BackupDir"
    exit 1
}

Write-Log "Rolling back to: $BackupId"

# Confirm rollback
$Confirm = Read-Host "WARNING: This will revert to previous deployment. Continue? (y/n)"
if ($Confirm -ne "y" -and $Confirm -ne "Y") {
    Write-Error-Log "Rollback cancelled"
    exit 1
}

# Stop application
Write-Log "Stopping application..."
try {
    $Process = Get-Process node -ErrorAction SilentlyContinue
    if ($Process) {
        Stop-Process -InputObject $Process -Force
        Write-Log "Stopped Node.js process"
    }
} catch {
    Write-Warn "Could not stop application: $_"
}

# Backup current state before rollback
Write-Log "Creating pre-rollback backup..."
$CurrentBackup = Join-Path $BackupBase "pre_rollback_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Path $CurrentBackup -Force | Out-Null

$DistPath = Join-Path $ProjectRoot "dist"
if (Test-Path $DistPath) {
    Copy-Item -Path $DistPath -Destination (Join-Path $CurrentBackup "dist_backup") -Recurse -Force
}

$BuildPath = Join-Path $ProjectRoot "build"
if (Test-Path $BuildPath) {
    Copy-Item -Path $BuildPath -Destination (Join-Path $CurrentBackup "build_backup") -Recurse -Force
}

Write-Success "Pre-rollback backup created at $CurrentBackup"

# Restore from backup
Write-Log "Restoring files from backup..."

$RestoreDistPath = Join-Path $BackupDir "dist_backup"
if (Test-Path $RestoreDistPath) {
    Write-Log "Restoring frontend (dist)..."
    Remove-Item -Path $DistPath -Recurse -Force -ErrorAction SilentlyContinue
    Copy-Item -Path $RestoreDistPath -Destination $DistPath -Recurse -Force
    Write-Success "Frontend restored"
}

$RestoreBuildPath = Join-Path $BackupDir "build_backup"
if (Test-Path $RestoreBuildPath) {
    Write-Log "Restoring backend (build)..."
    Remove-Item -Path $BuildPath -Recurse -Force -ErrorAction SilentlyContinue
    Copy-Item -Path $RestoreBuildPath -Destination $BuildPath -Recurse -Force
    Write-Success "Backend restored"
}

# Verify restored files
Write-Log "Verifying restored files..."

$RequiredFiles = @(
    "dist\index.html",
    "package.json",
    "server\package.json"
)

foreach ($file in $RequiredFiles) {
    $FilePath = Join-Path $ProjectRoot $file
    if (!(Test-Path $FilePath)) {
        Write-Error-Log "Required file missing after restore: $file"
        exit 1
    }
}

Write-Success "All required files verified"

# Database rollback (if needed)
$DbBackupPath = Join-Path $BackupDir "db_backup.sql"
if (Test-Path $DbBackupPath) {
    $DbRestore = Read-Host "Database backup found. Restore? (y/n)"
    if ($DbRestore -eq "y" -or $DbRestore -eq "Y") {
        Write-Log "Restoring database..."
        if ($env:DATABASE_URL) {
            Get-Content $DbBackupPath | psql $env:DATABASE_URL
            Write-Success "Database restored"
        } else {
            Write-Warn "DATABASE_URL not set, skipping database restore"
        }
    }
}

# Restart application
Write-Log "Restarting application..."
Set-Location $ProjectRoot

try {
    npm start
    Write-Success "Application started"
} catch {
    Write-Error-Log "Failed to start application: $_"
    exit 1
}

# Wait for application to start
Write-Log "Waiting for application to start..."
Start-Sleep -Seconds 5

# Health check
Write-Log "Performing health check..."
$MaxAttempts = 10
$Attempt = 0

while ($Attempt -lt $MaxAttempts) {
    try {
        $Response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing
        if ($Response.StatusCode -eq 200) {
            Write-Success "Application is healthy"
            break
        }
    } catch {
        # Continue
    }
    
    $Attempt++
    if ($Attempt -lt $MaxAttempts) {
        Write-Log "Waiting for application... (attempt $Attempt/$MaxAttempts)"
        Start-Sleep -Seconds 2
    }
}

if ($Attempt -ge $MaxAttempts) {
    Write-Error-Log "Application failed to start after rollback"
    exit 1
}

# Summary
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Rollback completed successfully!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Log "Restored backup: $BackupId"
Write-Log "Pre-rollback backup: $CurrentBackup"
Write-Log "Rollback log: $RollbackLog"
Write-Host ""

Write-Success "System is running previous version"

exit 0

