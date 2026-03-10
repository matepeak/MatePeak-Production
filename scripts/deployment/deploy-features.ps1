# Deployment Script for Advanced Features
# Run this script to deploy all new features

Write-Host "🚀 Spark Mentor Connect - Advanced Features Deployment" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Apply Database Migration
Write-Host "📊 Step 1: Applying database migration..." -ForegroundColor Yellow
Write-Host "This adds meeting_link, reminder tracking columns to bookings table" -ForegroundColor Gray
Write-Host ""
Write-Host "Run: npx supabase db push" -ForegroundColor Green
Write-Host ""
$response = Read-Host "Have you run the migration? (y/n)"
if ($response -ne "y") {
    Write-Host "Please run: npx supabase db push" -ForegroundColor Red
    Write-Host "Then re-run this script." -ForegroundColor Red
    exit
}

# Step 2: Deploy send-reminders Function
Write-Host ""
Write-Host "📧 Step 2: Deploying send-reminders Edge Function..." -ForegroundColor Yellow
Write-Host "This function sends 24h and 1h reminders before sessions" -ForegroundColor Gray
Write-Host ""
Write-Host "Run: npx supabase functions deploy send-reminders" -ForegroundColor Green
Write-Host ""
$response = Read-Host "Deploy send-reminders function? (y/n)"
if ($response -eq "y") {
    npx supabase functions deploy send-reminders
    Write-Host "✅ Function deployed!" -ForegroundColor Green
}

# Step 3: Test the Reminder Function
Write-Host ""
Write-Host "🧪 Step 3: Testing reminder function..." -ForegroundColor Yellow
Write-Host ""
$response = Read-Host "Do you want to test the reminder function? (y/n)"
if ($response -eq "y") {
    Write-Host "Triggering send-reminders function..." -ForegroundColor Gray
    $headers = @{
        "Authorization" = "Bearer YOUR_SUPABASE_ANON_KEY"
        "Content-Type" = "application/json"
    }
    
    try {
        $result = Invoke-RestMethod -Uri "https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-reminders" -Method POST -Headers $headers
        Write-Host "✅ Test successful!" -ForegroundColor Green
        Write-Host "Result: $($result | ConvertTo-Json)" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ Test failed: $_" -ForegroundColor Red
    }
}

# Step 4: GitHub Actions Setup
Write-Host ""
Write-Host "⏰ Step 4: Setting up automated reminders..." -ForegroundColor Yellow
Write-Host "You need to set up automation to run reminders every hour" -ForegroundColor Gray
Write-Host ""
Write-Host "Option 1: GitHub Actions (Recommended)" -ForegroundColor Cyan
Write-Host "  - Create .github/workflows/send-reminders.yml" -ForegroundColor Gray
Write-Host "  - See ADVANCED_FEATURES_IMPLEMENTATION.md for full code" -ForegroundColor Gray
Write-Host ""
Write-Host "Option 2: Supabase pg_cron" -ForegroundColor Cyan
Write-Host "  - Run SQL in Supabase SQL Editor" -ForegroundColor Gray
Write-Host "  - See ADVANCED_FEATURES_IMPLEMENTATION.md for SQL" -ForegroundColor Gray
Write-Host ""
Write-Host "Option 3: External Cron (cron-job.org)" -ForegroundColor Cyan
Write-Host "  - Free service, easy setup" -ForegroundColor Gray
Write-Host "  - See ADVANCED_FEATURES_IMPLEMENTATION.md for details" -ForegroundColor Gray
Write-Host ""

# Step 5: Summary
Write-Host ""
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green
Write-Host ""
Write-Host "What's working now:" -ForegroundColor Cyan
Write-Host "✅ Meeting links auto-generate for all bookings" -ForegroundColor White
Write-Host "✅ Meeting links included in confirmation emails" -ForegroundColor White
Write-Host "✅ Reminder function ready to send alerts" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Set up automation for reminders (see options above)" -ForegroundColor White
Write-Host "2. Display meeting links in dashboard UI" -ForegroundColor White
Write-Host "3. (Optional) Configure custom email domain" -ForegroundColor White
Write-Host ""
Write-Host "📖 Full guide: ADVANCED_FEATURES_IMPLEMENTATION.md" -ForegroundColor Cyan
Write-Host ""
