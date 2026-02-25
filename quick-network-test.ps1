# Quick Network Diagnostic Script
# This will identify why you can't connect to Supabase

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  SUPABASE CONNECTION DIAGNOSTIC" -ForegroundColor Cyan
Write-Host "  Project: DEMatepeak (hnevrdlcqhmsfubakljg)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$SUPABASE_HOST = "hnevrdlcqhmsfubakljg.supabase.co"
$SUPABASE_URL = "https://$SUPABASE_HOST"
$testsPassed = 0
$testsFailed = 0

# Test 1: Internet Connectivity
Write-Host "[1/6] Testing internet connectivity..." -ForegroundColor Yellow
try {
    $ping = Test-Connection -ComputerName 8.8.8.8 -Count 2 -Quiet -ErrorAction Stop
    if ($ping) {
        Write-Host "  ✅ Internet: Connected" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "  ❌ Internet: No connection" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "  ⚠️  Internet: Cannot test" -ForegroundColor Yellow
}
Write-Host ""

# Test 2: DNS Resolution
Write-Host "[2/6] Testing DNS resolution..." -ForegroundColor Yellow
try {
    $dns = Resolve-DnsName -Name $SUPABASE_HOST -ErrorAction Stop
    if ($dns) {
        Write-Host "  ✅ DNS: Resolves to $($dns[0].IPAddress)" -ForegroundColor Green
        $testsPassed++
    }
} catch {
    Write-Host "  ❌ DNS: Cannot resolve domain" -ForegroundColor Red
    Write-Host "     Fix: Change DNS to Google (8.8.8.8)" -ForegroundColor Yellow
    $testsFailed++
}
Write-Host ""

# Test 3: Port 443 Connectivity
Write-Host "[3/6] Testing port 443 connectivity (may take 20 seconds)..." -ForegroundColor Yellow
try {
    $portTest = Test-NetConnection -ComputerName $SUPABASE_HOST -Port 443 -WarningAction SilentlyContinue
    if ($portTest.TcpTestSucceeded) {
        Write-Host "  ✅ Port 443: Open" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "  ❌ Port 443: Blocked or timeout" -ForegroundColor Red
        Write-Host "     Cause: Firewall or network restriction" -ForegroundColor Yellow
        Write-Host "     Fix: Disable firewall temporarily or use VPN" -ForegroundColor Yellow
        $testsFailed++
    }
} catch {
    Write-Host "  ❌ Port 443: Cannot connect" -ForegroundColor Red
    Write-Host "     Fix: Disable firewall or connect to mobile hotspot" -ForegroundColor Yellow
    $testsFailed++
}
Write-Host ""

# Test 4: HTTP Request
Write-Host "[4/6] Testing HTTP connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/" -Method HEAD -TimeoutSec 20 -ErrorAction Stop
    Write-Host "  ✅ HTTP: Status $($response.StatusCode)" -ForegroundColor Green
    $testsPassed++
} catch {
    Write-Host "  ❌ HTTP: Failed - $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Message -like "*timeout*") {
        Write-Host "     Cause: Connection timeout" -ForegroundColor Yellow
        Write-Host "     Fix: Network/firewall blocking Supabase" -ForegroundColor Yellow
    }
    $testsFailed++
}
Write-Host ""

# Test 5: VPN/Proxy Check
Write-Host "[5/6] Checking for VPN/Proxy..." -ForegroundColor Yellow
try {
    $vpn = Get-VpnConnection -ErrorAction SilentlyContinue
    if ($vpn -and ($vpn.ConnectionStatus -eq "Connected")) {
        Write-Host "  ⚠️  VPN: Active - $($vpn.Name)" -ForegroundColor Yellow
        Write-Host "     Try: Disconnect VPN and test again" -ForegroundColor Yellow
    } else {
        Write-Host "  ✅ VPN: Not active" -ForegroundColor Green
    }
    
    $proxy = netsh winhttp show proxy
    if ($proxy -like "*Direct access*") {
        Write-Host "  ✅ Proxy: Not configured" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Proxy: Configured" -ForegroundColor Yellow
        Write-Host "     $proxy" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ⚠️  Cannot check VPN/Proxy status" -ForegroundColor Yellow
}
Write-Host ""

# Test 6: Firewall Check
Write-Host "[6/6] Checking Windows Firewall..." -ForegroundColor Yellow
try {
    $firewallProfiles = Get-NetFirewallProfile -ErrorAction SilentlyContinue
    $enabledProfiles = $firewallProfiles | Where-Object { $_.Enabled -eq $true }
    if ($enabledProfiles) {
        Write-Host "  ⚠️  Firewall: Enabled on $($enabledProfiles.Count) profile(s)" -ForegroundColor Yellow
        foreach ($profile in $enabledProfiles) {
            Write-Host "     - $($profile.Name)" -ForegroundColor Gray
        }
        Write-Host "     Try: Temporarily disable to test" -ForegroundColor Yellow
    } else {
        Write-Host "  ✅ Firewall: Disabled" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⚠️  Cannot check firewall status" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  DIAGNOSTIC SUMMARY" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tests Passed: $testsPassed" -ForegroundColor Green
Write-Host "Tests Failed: $testsFailed" -ForegroundColor Red
Write-Host ""

# Recommendations
if ($testsFailed -eq 0) {
    Write-Host "ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your network CAN reach Supabase." -ForegroundColor Green
    Write-Host "The app issue might be:" -ForegroundColor Yellow
    Write-Host "  1. Browser cache - Clear it with Ctrl+Shift+Delete" -ForegroundColor White
    Write-Host "  2. Environment variables - Check .env file" -ForegroundColor White
    Write-Host "  3. Application code - Check browser console with F12" -ForegroundColor White
    Write-Host ""
    Write-Host "Next step: Restart dev server and clear browser cache" -ForegroundColor Cyan
} else {
    Write-Host "CONNECTION ISSUE DETECTED" -ForegroundColor Red
    Write-Host ""
    Write-Host "Your network CANNOT reach Supabase." -ForegroundColor Red
    Write-Host ""
    Write-Host "RECOMMENDED FIXES (try in order):" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. MOBILE HOTSPOT TEST - 5 minutes" -ForegroundColor Cyan
    Write-Host "   Connect to mobile hotspot" -ForegroundColor White
    Write-Host "   Run this script again" -ForegroundColor White
    Write-Host "   If it works → Your network is blocking Supabase" -ForegroundColor White
    Write-Host ""
    Write-Host "2. DISABLE FIREWALL - 2 minutes" -ForegroundColor Cyan
    Write-Host "   Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled `$false" -ForegroundColor Gray
    Write-Host "   Run this script again" -ForegroundColor White
    Write-Host "   If it works → Firewall is blocking" -ForegroundColor White
    Write-Host "   Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled `$true" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. CHANGE DNS - 3 minutes" -ForegroundColor Cyan
    Write-Host "   Change DNS to Google 8.8.8.8" -ForegroundColor White
    Write-Host "   Clear DNS cache: ipconfig /flushdns" -ForegroundColor White
    Write-Host "   Run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "4. DISABLE VPN - 1 minute" -ForegroundColor Cyan
    Write-Host "   Disconnect any VPN" -ForegroundColor White
    Write-Host "   Run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "5. USE VPN - 5 minutes" -ForegroundColor Cyan
    Write-Host "   Download Cloudflare WARP from https://1.1.1.1/" -ForegroundColor White
    Write-Host "   Enable WARP" -ForegroundColor White
    Write-Host "   Run this script again" -ForegroundColor White
    Write-Host ""
}

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "For detailed troubleshooting, see:" -ForegroundColor Cyan
Write-Host "  - NETWORK_CONNECTIVITY_FIX.md" -ForegroundColor White
Write-Host "  - COMPLETE_FIX_GUIDE.md" -ForegroundColor White
Write-Host ""
Write-Host "To test in browser, open: test-supabase-health.html" -ForegroundColor Cyan
Write-Host ""

# Offer to open browser test
$openBrowser = Read-Host "Open browser test page? (y/n)"
if ($openBrowser -eq "y" -or $openBrowser -eq "Y") {
    Start-Process "test-supabase-health.html"
}
