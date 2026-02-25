# Supabase Connection Diagnostic and Fix Script
# This script checks why the Supabase connection is timing out

Write-Host "🔍 Diagnosing Supabase Connection Issue..." -ForegroundColor Cyan
Write-Host ""

$SUPABASE_URL = "https://hnevrdlcqhmsfubakljg.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZXZyZGxjcWhtc2Z1YmFrbGpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNDIzMDEsImV4cCI6MjA3NTYxODMwMX0.e4OjzNc4A6d6petuDQFW-iD6JPVqwmy5Y_KWvgXabBA"

# Test 1: Check internet connectivity
Write-Host "Test 1: Checking internet connectivity..." -ForegroundColor Yellow
try {
    $internetTest = Test-Connection -ComputerName 8.8.8.8 -Count 2 -Quiet
    if ($internetTest) {
        Write-Host "✅ Internet connection: OK" -ForegroundColor Green
    } else {
        Write-Host "❌ No internet connection detected" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "⚠️  Could not test internet connection" -ForegroundColor Yellow
}

Write-Host ""

# Test 2: Check DNS resolution
Write-Host "Test 2: Checking DNS resolution..." -ForegroundColor Yellow
try {
    $dnsTest = Resolve-DnsName -Name "hnevrdlcqhmsfubakljg.supabase.co" -ErrorAction Stop
    Write-Host "✅ DNS resolution: OK" -ForegroundColor Green
    Write-Host "   IP Address: $($dnsTest[0].IPAddress)" -ForegroundColor Gray
} catch {
    Write-Host "❌ DNS resolution failed - cannot resolve Supabase domain" -ForegroundColor Red
    Write-Host "   This might be a DNS issue or the domain is invalid" -ForegroundColor Yellow
}

Write-Host ""

# Test 3: Check if Supabase endpoint is reachable
Write-Host "Test 3: Testing Supabase API endpoint (30 second timeout)..." -ForegroundColor Yellow
try {
    $headers = @{
        "apikey" = $SUPABASE_KEY
        "Authorization" = "Bearer $SUPABASE_KEY"
    }
    
    $response = Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/" -Method HEAD -Headers $headers -TimeoutSec 30 -ErrorAction Stop
    Write-Host "✅ Supabase API reachable: $($response.StatusCode)" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 SUCCESS! Your Supabase database is accessible." -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 If the app still doesn't work, the issue is in the application code:" -ForegroundColor Cyan
    Write-Host "   1. Clear browser cache (Ctrl+Shift+Delete)" -ForegroundColor White
    Write-Host "   2. Check browser DevTools console for errors" -ForegroundColor White
    Write-Host "   3. Verify .env file has correct values" -ForegroundColor White
    Write-Host "   4. Restart the development server" -ForegroundColor White
    
} catch {
    Write-Host "❌ FAILED: Cannot reach Supabase endpoint" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    
    # Analyze the error
    if ($_.Exception.Message -like "*timed out*" -or $_.Exception.Message -like "*timeout*") {
        Write-Host "🔴 DIAGNOSIS: CONNECTION TIMEOUT" -ForegroundColor Red
        Write-Host ""
        Write-Host "This usually means ONE of these:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "1️⃣  MOST LIKELY: Supabase project is PAUSED (inactive for 7+ days)" -ForegroundColor Yellow
        Write-Host "   Fix: Log into Supabase Dashboard and UNPAUSE the project" -ForegroundColor White
        Write-Host "   URL: https://supabase.com/dashboard/project/hnevrdlcqhmsfubakljg" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "2️⃣  Firewall/Antivirus blocking the connection" -ForegroundColor Yellow
        Write-Host "   Fix: Temporarily disable firewall/antivirus and test again" -ForegroundColor White
        Write-Host ""
        Write-Host "3️⃣  VPN interfering with the connection" -ForegroundColor Yellow
        Write-Host "   Fix: Disconnect VPN and test again" -ForegroundColor White
        Write-Host ""
        Write-Host "4️⃣  Corporate/School network blocking cloud databases" -ForegroundColor Yellow
        Write-Host "   Fix: Try connecting via mobile hotspot" -ForegroundColor White
        Write-Host ""
    } elseif ($_.Exception.Message -like "*404*") {
        Write-Host "🔴 DIAGNOSIS: Project not found (404)" -ForegroundColor Red
        Write-Host "   Your Supabase project might have been deleted" -ForegroundColor Yellow
        Write-Host "   Check: https://supabase.com/dashboard" -ForegroundColor Cyan
    } elseif ($_.Exception.Message -like "*401*" -or $_.Exception.Message -like "*403*") {
        Write-Host "🔴 DIAGNOSIS: Authentication error" -ForegroundColor Red
        Write-Host "   Your API key might be invalid or expired" -ForegroundColor Yellow
        Write-Host "   Check: .env file has correct VITE_SUPABASE_ANON_KEY" -ForegroundColor Cyan
    } else {
        Write-Host "🔴 DIAGNOSIS: Unknown error" -ForegroundColor Red
        Write-Host "   Check Supabase status: https://status.supabase.com" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "📋 Quick Actions:" -ForegroundColor Cyan
Write-Host "1. Open Supabase Dashboard: https://supabase.com/dashboard/project/hnevrdlcqhmsfubakljg" -ForegroundColor White
Write-Host "2. Check if project shows 'PAUSED' status" -ForegroundColor White
Write-Host "3. Click 'Restore' or 'Unpause' if paused" -ForegroundColor White
Write-Host "4. Wait 30-60 seconds for project to wake up" -ForegroundColor White
Write-Host "5. Run this script again to verify" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

# Test 4: Try to query expert_profiles table
Write-Host ""
Write-Host "Test 4: Attempting to query expert_profiles table..." -ForegroundColor Yellow
try {
    $headers = @{
        "apikey" = $SUPABASE_KEY
        "Authorization" = "Bearer $SUPABASE_KEY"
    }
    
    $queryResponse = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/expert_profiles?select=count&limit=1" -Method GET -Headers $headers -TimeoutSec 30 -ErrorAction Stop
    Write-Host "✅ Database query successful!" -ForegroundColor Green
    Write-Host "   Response: $($queryResponse | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  Could not query database: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Diagnostic complete!" -ForegroundColor Cyan
