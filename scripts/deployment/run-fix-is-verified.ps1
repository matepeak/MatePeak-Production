# Fix Missing is_verified Column - Instructions
# Run this script to see what to do

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FIX: Missing is_verified Column" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "ERROR DETAILS:" -ForegroundColor Red
Write-Host "Could not find the 'is_verified' column of 'expert_profiles' in the schema cache`n"

Write-Host "CAUSE:" -ForegroundColor Yellow
Write-Host "The migration '20251029130000_add_profile_status_and_visibility.sql' was not run yet.`n"

Write-Host "SOLUTION - Follow these steps:" -ForegroundColor Green
Write-Host "1. Open your Supabase Dashboard" -ForegroundColor White
Write-Host "   https://supabase.com/dashboard`n"

Write-Host "2. Navigate to SQL Editor" -ForegroundColor White
Write-Host "   Dashboard > SQL Editor > New Query`n"

Write-Host "3. Copy the contents of this file:" -ForegroundColor White
Write-Host "   fix-missing-is-verified-column.sql`n" -ForegroundColor Cyan

Write-Host "4. Paste into Supabase SQL Editor and click RUN`n" -ForegroundColor White

Write-Host "5. Verify success - You should see:" -ForegroundColor White
Write-Host "   - 3 rows returned showing:" -ForegroundColor Gray
Write-Host "     * is_featured  | boolean | false" -ForegroundColor Gray
Write-Host "     * is_verified  | boolean | false" -ForegroundColor Gray
Write-Host "     * profile_status | text | 'active'::text`n" -ForegroundColor Gray

Write-Host "QUICK COPY:" -ForegroundColor Yellow
Write-Host "Opening the SQL file for you...`n"

# Open the SQL file
$sqlFile = "$PSScriptRoot\fix-missing-is-verified-column.sql"
if (Test-Path $sqlFile) {
    code $sqlFile
    Write-Host "✓ Opened: fix-missing-is-verified-column.sql" -ForegroundColor Green
    Write-Host "  Copy all contents and paste into Supabase SQL Editor`n"
} else {
    Write-Host "✗ Could not find: fix-missing-is-verified-column.sql" -ForegroundColor Red
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "After running the migration, your mentor verification workflow will work correctly!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
