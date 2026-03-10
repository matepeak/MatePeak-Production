# Scripts Documentation

This directory contains utility scripts organized by purpose. All scripts should be run from the project root directory.

## 📁 Directory Structure

```
scripts/
├── deployment/          # Deployment and CI/CD scripts
├── sql/                # SQL utility and maintenance scripts
└── utilities/          # General utility scripts
```

## 🚀 Deployment Scripts (`deployment/`)

PowerShell scripts for deploying features and managing infrastructure.

### `apply-skills-migration.ps1`
Applies database migrations for skills and expertise features.

```powershell
.\scripts\deployment\apply-skills-migration.ps1
```

### `deploy-features.ps1`
Deploys new features to production environment.

```powershell
.\scripts\deployment\deploy-features.ps1
```

### `diagnose-and-fix-supabase.ps1`
Diagnoses and fixes common Supabase configuration issues.

```powershell
.\scripts\deployment\diagnose-and-fix-supabase.ps1
```

### `diagnose-supabase.ps1`
Runs diagnostics on Supabase connection and configuration.

```powershell
.\scripts\deployment\diagnose-supabase.ps1
```

### `fix-reminders.ps1`
Fixes reminder notification system.

```powershell
.\scripts\deployment\fix-reminders.ps1
```

### `quick-network-test.ps1`
Tests network connectivity to external services.

```powershell
.\scripts\deployment\quick-network-test.ps1
```

### `run-fix-is-verified.ps1`
Fixes is_verified column issues in database.

```powershell
.\scripts\deployment\run-fix-is-verified.ps1
```

### `test-connection.ps1`
Tests connection to Supabase and other services.

```powershell
.\scripts\deployment\test-connection.ps1
```

### `unpause-supabase.ps1`
Unpauses a paused Supabase project.

```powershell
.\scripts\deployment\unpause-supabase.ps1
```

## 🗄️ SQL Utility Scripts (`sql/`)

SQL scripts for database maintenance, fixes, and migrations.

### Database Diagnostics

- `diagnose-booking-system.sql` - Diagnoses booking system issues
- `diagnose-database-issue.sql` - General database diagnostics
- `debug-mentor-ids.sql` - Debugs mentor ID mismatches

### Database Fixes

- `fix-booking-error.sql` - Fixes booking-related errors
- `fix-booking-requests-rls.sql` - Fixes RLS policies for booking requests
- `fix-booking-requests-table.sql` - Fixes booking requests table structure
- `fix-certificate-bucket.sql` - Fixes certificate storage bucket
- `fix-mentor-id-mismatch.sql` - Fixes mentor ID inconsistencies
- `fix-mentor-rls.sql` - Fixes RLS policies for mentor tables
- `fix-missing-is-verified-column.sql` - Adds missing is_verified column
- `fix-rls-policies.sql` - General RLS policy fixes
- `fix-session-calendar-bookings-table.sql` - Fixes session calendar table
- `fix-student-dashboard.sql` - Fixes student dashboard queries
- `FIX_CATEGORIES_ERROR.sql` - Fixes category-related errors

### Migrations

- `migrate-phase1-availability.sql` - Phase 1 availability feature migration

## 🧪 Test Scripts (`tests/`)

Test files organized by type.

### SQL Tests (`tests/sql/`)

- `test-add-languages.sql` - Tests language addition
- `test-review-system.sql` - Tests review system
- `add-test-languages.sql` - Adds test language data
- `check-booking-exists.sql` - Checks if bookings exist
- `check-mentors-in-db.sql` - Checks mentor data
- `verify-booking-requests-table.sql` - Verifies booking requests table
- `verify-expertise-mapping.sql` - Verifies expertise mappings

### HTML Tests (`tests/html/`)

- `test-supabase-connection.html` - Tests Supabase connection from browser
- `test-supabase-health.html` - Tests Supabase health status
- `quick-test.html` - Quick functionality tests
- `wait-for-supabase.html` - Waits for Supabase to be ready

### Integration Tests (`tests/integration/`)

- `test-mentor-fetch.ts` - Tests mentor data fetching

## 💡 Usage Guidelines

### Running PowerShell Scripts

```powershell
# From project root
.\scripts\deployment\script-name.ps1

# With elevated permissions (if needed)
Start-Process powershell -Verb RunAs -ArgumentList "-File .\scripts\deployment\script-name.ps1"
```

### Running SQL Scripts

**Via Supabase Dashboard:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy script content
3. Paste and execute

**Via psql:**
```bash
psql -h db.xxxxxxxxxxxx.supabase.co -U postgres -d postgres -f scripts/sql/script-name.sql
```

### Running Tests

```bash
# SQL tests - Run via Supabase SQL Editor

# HTML tests - Open in browser
open tests/html/test-supabase-connection.html

# Integration tests
npm run test:integration
```

## ⚠️ Important Notes

### Before Running Scripts

1. **Backup your database** before running any fix or migration scripts
2. **Read the script** to understand what it does
3. **Test in development** environment first
4. **Check prerequisites** (environment variables, permissions)

### Script Conventions

- PowerShell scripts use `.ps1` extension
- SQL scripts use `.sql` extension
- All scripts assume they're run from project root
- Scripts should be idempotent (safe to run multiple times)
- Scripts should include error handling

### Security

- Never commit scripts with hardcoded credentials
- Use environment variables for sensitive data
- Review scripts before running in production
- Keep deployment scripts in `scripts/deployment/`

## 📝 Adding New Scripts

When adding new scripts:

1. Place in appropriate directory (`deployment/`, `sql/`, or `utilities/`)
2. Add documentation to this README
3. Include comments in the script explaining purpose
4. Add error handling
5. Make script idempotent if possible
6. Test thoroughly before committing

### Script Template (PowerShell)

```powershell
# Script: script-name.ps1
# Purpose: Brief description
# Usage: .\scripts\deployment\script-name.ps1
# Author: Your Name
# Date: YYYY-MM-DD

# Exit on error
$ErrorActionPreference = "Stop"

# Script logic here
Write-Host "Starting script execution..."

try {
    # Your code here
    Write-Host "✅ Script completed successfully"
} catch {
    Write-Error "❌ Script failed: $_"
    exit 1
}
```

### Script Template (SQL)

```sql
-- Script: script-name.sql
-- Purpose: Brief description
-- Usage: Run via Supabase SQL Editor or psql
-- Author: Your Name
-- Date: YYYY-MM-DD

-- Start transaction
BEGIN;

-- Your SQL here

-- Commit transaction
COMMIT;
```

## 🔗 Related Documentation

- [Deployment Guide](../docs/deployment/DEPLOYMENT_STATUS.md)
- [Database Schema](../docs/API_DOCUMENTATION.md)
- [Testing Guide](../docs/testing/)
- [Troubleshooting](../docs/troubleshooting/)

---

**Note**: Scripts in this directory are utility tools and should not be confused with:
- **Supabase migrations** - Located in `supabase/migrations/`
- **npm scripts** - Defined in `package.json`
- **CI/CD workflows** - Located in `.github/workflows/`
