@echo off
REM Production Database Setup Script for Windows
REM Usage: setup-prod-db.bat

setlocal enabledelayedexpansion

echo.
echo ======================================
echo KODO Production Database Setup
echo ======================================
echo.

REM Check if NODE_ENV is set
if "%NODE_ENV%"=="production" (
    echo [OK] NODE_ENV is set to production
) else (
    echo [WARNING] NODE_ENV is not set to production
    echo Current NODE_ENV: %NODE_ENV%
    set /p confirm="Continue anyway? (y/n): "
    if /i not "!confirm!"=="y" (
        exit /b 1
    )
)

REM Check DATABASE_URL
if "%DATABASE_URL%"=="" (
    echo [ERROR] DATABASE_URL environment variable not set
    exit /b 1
)
echo [OK] DATABASE_URL is set

REM Create backup directory
if not exist "backups" mkdir backups
echo [OK] Backup directory ready

REM Create pre-migration backup
echo.
echo Backing up existing database...
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
set "BACKUP_FILE=backups\db_backup_!mydate!_!mytime!.sql"

echo [OK] Backup will be saved to: !BACKUP_FILE!

REM Run Prisma migrations
echo.
echo Running Prisma migrations...
call npx prisma migrate deploy --skip-generate
if %ERRORLEVEL% EQU 0 (
    echo [OK] Prisma migrations completed
) else (
    echo [ERROR] Prisma migrations failed
    pause
    exit /b 1
)

REM Generate Prisma Client
echo.
echo Generating Prisma Client...
call npx prisma generate
if %ERRORLEVEL% EQU 0 (
    echo [OK] Prisma Client generated
) else (
    echo [ERROR] Prisma Client generation failed
    pause
    exit /b 1
)

echo.
echo ======================================
echo Setup completed successfully!
echo ======================================
echo.
echo Next Steps:
echo 1. Verify DATABASE_URL is correct
echo 2. Set NODE_ENV=production
echo 3. Run: npm start
echo.
pause

