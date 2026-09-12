# Automated Database Backup Script (PowerShell)
# Usage: .\backup-db.ps1 -Type full -BackupDir ./backups -RetentionDays 30

param(
    [string]$Type = "full",
    [string]$BackupDir = "./backups",
    [int]$RetentionDays = 30,
    [bool]$Compress = $true
)

# Configuration
$DatabaseUrl = $env:DATABASE_URL
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "kodo_db_${Type}_${Timestamp}.sql"

# Create backup directory
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Write-Host "[INFO] Created backup directory: $BackupDir"
}

Write-Host "[INFO] Starting database backup (Type: $Type)"

# Determine database type and create backup
if ($DatabaseUrl -like "postgresql:*") {
    # PostgreSQL backup
    Write-Host "[INFO] Detected PostgreSQL database"
    
    # Parse connection string
    # Format: postgresql://user:password@host:port/database
    $DbName = ($DatabaseUrl -split '/')[-1]
    $DbHost = [regex]::Match($DatabaseUrl, '@([^:/]+)').Groups[1].Value
    $DbUser = [regex]::Match($DatabaseUrl, 'postgresql://([^:]+)').Groups[1].Value
    $DbPort = [regex]::Match($DatabaseUrl, ':([0-9]+)').Groups[1].Value -replace '.*@', ''
    if (-not $DbPort) { $DbPort = "5432" }
    
    Write-Host "[INFO] Database: $DbName on $DbHost`:$DbPort"
    
    # Backup PostgreSQL
    try {
        $env:PGPASSWORD = [regex]::Match($DatabaseUrl, ':([^@]+)@').Groups[1].Value
        & pg_dump -h $DbHost -p $DbPort -U $DbUser $DbName | Out-File -FilePath $BackupFile -Encoding UTF8
        Write-Host "[SUCCESS] Backup created: $BackupFile"
    }
    catch {
        Write-Host "[ERROR] Failed to create PostgreSQL backup: $_" -ForegroundColor Red
        exit 1
    }
}
elseif ($DatabaseUrl -like "file:*") {
    # SQLite backup
    Write-Host "[INFO] Detected SQLite database"
    
    $DbFile = $DatabaseUrl -replace "file:", "" -replace "./", ""
    
    if (Test-Path $DbFile) {
        Copy-Item -Path $DbFile -Destination $BackupFile -Force
        Write-Host "[SUCCESS] Backup created: $BackupFile"
    }
    else {
        Write-Host "[ERROR] SQLite database file not found: $DbFile" -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host "[ERROR] Unsupported database URL: $DatabaseUrl" -ForegroundColor Red
    exit 1
}

# Compression
if ($Compress) {
    Write-Host "[INFO] Compressing backup..."
    
    try {
        $CompressedFile = "$BackupFile.gz"
        $input = New-Object System.IO.FileStream $BackupFile, ([IO.FileMode]::Open), ([IO.FileAccess]::Read)
        $output = New-Object System.IO.FileStream $CompressedFile, ([IO.FileMode]::Create), ([IO.FileAccess]::Write)
        $gzipStream = New-Object System.IO.Compression.GzipStream $output, ([IO.Compression.CompressionMode]::Compress)
        $input.CopyTo($gzipStream)
        $gzipStream.Close()
        $output.Close()
        $input.Close()
        
        Remove-Item $BackupFile
        $BackupFile = $CompressedFile
        Write-Host "[SUCCESS] Backup compressed"
    }
    catch {
        Write-Host "[WARNING] Compression failed: $_" -ForegroundColor Yellow
    }
}

# Get backup size
$Size = (Get-Item $BackupFile).Length / 1MB
Write-Host "[INFO] Backup size: $([math]::Round($Size, 2)) MB"

# Cleanup old backups
Write-Host "[INFO] Cleaning up backups older than $RetentionDays days..."

$CutoffDate = (Get-Date).AddDays(-$RetentionDays)
$OldBackups = Get-ChildItem $BackupDir -Filter "kodo_db_*.sql*" | Where-Object { $_.LastWriteTime -lt $CutoffDate }
$DeletedCount = 0

foreach ($oldBackup in $OldBackups) {
    Remove-Item $oldBackup.FullName
    $DeletedCount++
}

if ($DeletedCount -gt 0) {
    Write-Host "[INFO] Deleted $DeletedCount old backup(s)"
}

# Log backup metadata
$LogFile = Join-Path $BackupDir ".backup_log"
$LogEntry = @"
Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Type: $Type
File: $(Split-Path $BackupFile -Leaf)
Size: $([math]::Round($Size, 2)) MB
Status: SUCCESS
---
"@

Add-Content -Path $LogFile -Value $LogEntry

Write-Host "[SUCCESS] Backup completed successfully!" -ForegroundColor Green
exit 0

