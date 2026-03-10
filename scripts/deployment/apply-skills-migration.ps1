# Apply the skills column migration to Supabase
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Skills Column Migration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$migrationFile = "supabase/migrations/20260304000001_add_skills_column.sql"

# Check if migration file exists
if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Migration file found: $migrationFile" -ForegroundColor Green
Write-Host ""

# Read migration SQL
$migrationSQL = Get-Content $migrationFile -Raw

Write-Host "Migration SQL:" -ForegroundColor Yellow
Write-Host "------------------------" -ForegroundColor Gray
Write-Host $migrationSQL -ForegroundColor White
Write-Host "------------------------" -ForegroundColor Gray
Write-Host ""

# Check if Supabase CLI is installed
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue

if ($supabaseInstalled) {
    Write-Host "✅ Supabase CLI detected" -ForegroundColor Green
    Write-Host ""
    Write-Host "Running migration..." -ForegroundColor Yellow
    
    try {
        supabase db push
        Write-Host ""
        Write-Host "✅ Migration applied successfully!" -ForegroundColor Green
    } catch {
        Write-Host ""
        Write-Host "❌ Error applying migration with CLI" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please apply manually using the Supabase Dashboard" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Supabase CLI not found" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To apply this migration, choose one of these options:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "OPTION 1: Use Supabase Dashboard (Recommended)" -ForegroundColor Green
    Write-Host "  1. Go to: https://supabase.com/dashboard/project/_/sql" -ForegroundColor White
    Write-Host "  2. Paste the SQL shown above" -ForegroundColor White
    Write-Host "  3. Click 'Run'" -ForegroundColor White
    Write-Host ""
    Write-Host "OPTION 2: Install Supabase CLI" -ForegroundColor Green
    Write-Host "  Windows: scoop install supabase" -ForegroundColor White
    Write-Host "  Then run: supabase db push" -ForegroundColor White
    Write-Host ""
}

Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
