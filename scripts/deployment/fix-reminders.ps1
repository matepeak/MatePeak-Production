# Fix Send-Reminders Function
# This script helps diagnose and fix the send-reminders function errors

Write-Host "🔧 Send-Reminders Function Diagnostics" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Supabase Secrets
Write-Host "📋 Step 1: Checking Supabase Secrets..." -ForegroundColor Yellow
Write-Host "Run this command to list current secrets:" -ForegroundColor White
Write-Host "npx supabase secrets list" -ForegroundColor Green
Write-Host ""
Write-Host "You should see:" -ForegroundColor White
Write-Host "  - RESEND_API_KEY" -ForegroundColor Gray
Write-Host "  - SUPABASE_URL" -ForegroundColor Gray
Write-Host "  - SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Gray
Write-Host ""

$response = Read-Host "Do you want to list secrets now? (y/n)"
if ($response -eq "y") {
    npx supabase secrets list
    Write-Host ""
}

# Step 2: Check Function Logs
Write-Host "📊 Step 2: Check Function Logs" -ForegroundColor Yellow
Write-Host "Go to:" -ForegroundColor White
Write-Host "https://supabase.com/dashboard/project/hnevrdlcqhmsfubakljg/functions/send-reminders/logs" -ForegroundColor Blue
Write-Host ""
Write-Host "Look for error messages in the logs to understand what's failing" -ForegroundColor White
Write-Host ""

$response = Read-Host "Press Enter when you've checked the logs..."

# Step 3: Set Missing Secrets
Write-Host "🔐 Step 3: Set Missing Secrets" -ForegroundColor Yellow
Write-Host ""
Write-Host "If any secrets are missing, run these commands:" -ForegroundColor White
Write-Host ""
Write-Host "# Set Resend API Key (get from https://resend.com/api-keys)" -ForegroundColor Gray
Write-Host "npx supabase secrets set RESEND_API_KEY=re_your_key_here" -ForegroundColor Green
Write-Host ""
Write-Host "# Set Supabase Service Role Key (from your Supabase project settings)" -ForegroundColor Gray
Write-Host "npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key_here" -ForegroundColor Green
Write-Host ""
Write-Host "# Set Supabase URL" -ForegroundColor Gray
Write-Host "npx supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co" -ForegroundColor Green
Write-Host ""

$response = Read-Host "Do you want to set secrets now? (y/n)"
if ($response -eq "y") {
    Write-Host ""
    $resendKey = Read-Host "Enter your RESEND_API_KEY (or press Enter to skip)"
    if ($resendKey) {
        npx supabase secrets set RESEND_API_KEY=$resendKey
    }
    
    Write-Host ""
    $serviceKey = Read-Host "Enter your SUPABASE_SERVICE_ROLE_KEY (or press Enter to skip)"
    if ($serviceKey) {
        npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=$serviceKey
    }
    
    Write-Host ""
    Write-Host "Setting SUPABASE_URL..." -ForegroundColor White
    npx supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
}

# Step 4: Test Function
Write-Host ""
Write-Host "🧪 Step 4: Test the Function" -ForegroundColor Yellow
Write-Host ""
Write-Host "After setting secrets, redeploy the function:" -ForegroundColor White
Write-Host "npx supabase functions deploy send-reminders" -ForegroundColor Green
Write-Host ""

$response = Read-Host "Do you want to redeploy now? (y/n)"
if ($response -eq "y") {
    npx supabase functions deploy send-reminders
}

# Step 5: Test with curl
Write-Host ""
Write-Host "🌐 Step 5: Test with Manual Call" -ForegroundColor Yellow
Write-Host ""
Write-Host "Run this command to test the function manually:" -ForegroundColor White
Write-Host "curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-reminders \`" -ForegroundColor Green
Write-Host "  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \`" -ForegroundColor Green
Write-Host "  -H 'Content-Type: application/json'" -ForegroundColor Green
Write-Host ""

Write-Host "✅ Diagnostics Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Summary of Actions:" -ForegroundColor Cyan
Write-Host "1. ✅ Workflow disabled (can be manually triggered)" -ForegroundColor White
Write-Host "2. Check function logs for specific errors" -ForegroundColor White
Write-Host "3. Set any missing secrets (RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY)" -ForegroundColor White
Write-Host "4. Redeploy the function" -ForegroundColor White
Write-Host "5. Test manually before re-enabling automation" -ForegroundColor White
Write-Host ""
Write-Host "To re-enable hourly reminders, uncomment the schedule in:" -ForegroundColor Yellow
Write-Host ".github\workflows\send-reminders.yml" -ForegroundColor Blue
