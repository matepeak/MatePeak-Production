# Network Connectivity Troubleshooting Guide

## Problem
Your Supabase project is **ACTIVE** but you're getting `ERR_CONNECTION_TIMED_OUT` errors.

## Diagnosis Steps

### Step 1: Test Direct Connection
Run in PowerShell:
```powershell
Test-NetConnection -ComputerName hnevrdlcqhmsfubakljg.supabase.co -Port 443
```

**Expected output:** `TcpTestSucceeded : True`  
**If it fails:** Your network/firewall is blocking Supabase

### Step 2: Test from Different Network
1. Connect to mobile hotspot
2. Try accessing your app again
3. If it works → Your primary network is blocking it

### Step 3: Check Firewall Settings

#### Windows Firewall
```powershell
# Check if Windows Firewall is blocking
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*Supabase*"}

# Temporarily disable (for testing only!)
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False

# After testing, re-enable
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True
```

#### Antivirus Software
- Temporarily disable antivirus (McAfee, Norton, Avast, etc.)
- Test connection again
- If it works, add Supabase to whitelist

### Step 4: Check VPN/Proxy
```powershell
# Check if VPN is active
Get-VpnConnection

# Check proxy settings
netsh winhttp show proxy
```

If VPN is active:
1. Disconnect VPN
2. Test connection
3. If it works, configure VPN to allow Supabase (split tunnel)

### Step 5: DNS Resolution Test
```powershell
# Test DNS resolution
nslookup hnevrdlcqhmsfubakljg.supabase.co

# Try Google DNS
nslookup hnevrdlcqhmsfubakljg.supabase.co 8.8.8.8
```

If DNS fails, change DNS servers:
```powershell
# Set Google DNS
$adapter = Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | Select-Object -First 1
Set-DnsClientServerAddress -InterfaceIndex $adapter.ifIndex -ServerAddresses ("8.8.8.8","8.8.4.4")

# To revert to automatic DNS
Set-DnsClientServerAddress -InterfaceIndex $adapter.ifIndex -ResetServerAddresses
```

---

## Common Causes & Solutions

### 1. Corporate/School Network
**Symptoms:** Works on mobile, fails on WiFi  
**Cause:** Network administrator blocked cloud databases  
**Solutions:**
- Request IT to whitelist `*.supabase.co`
- Use mobile hotspot for development
- Use VPN to bypass restrictions

### 2. ISP Blocking
**Symptoms:** Intermittent timeouts, works sometimes  
**Cause:** ISP throttling/blocking certain services  
**Solutions:**
- Change DNS to 8.8.8.8 (Google) or 1.1.1.1 (Cloudflare)
- Use VPN
- Contact ISP support

### 3. Antivirus/Firewall
**Symptoms:** Consistent timeouts  
**Cause:** Security software blocking outbound connections  
**Solutions:**
- Add exception for browser/Node.js
- Whitelist `*.supabase.co`
- Temporarily disable to confirm

### 4. Geographic Restrictions
**Symptoms:** Project in different region (AWS us-east-2)  
**Cause:** High latency or regional blocks  
**Solutions:**
- Use Supabase CLI to change region
- Consider using a CDN
- Use edge functions for better performance

### 5. Slow Query Performance
**Symptoms:** Timeout after 30 seconds  
**Cause:** Query takes too long (see slow queries in Supabase dashboard)  
**Solutions:**
- Add database indexes (see performance fixes below)
- Optimize queries
- Increase timeout in client

---

## Performance Optimization

Your dashboard shows slow queries. Let's optimize them:

### Slow Query 1: `SELECT name FROM pg_timezone_names`
This is a system query, usually fast. If slow, it indicates database overload.

### Slow Query 2: Schema queries (0.10s average)
Add indexes to speed up:
```sql
-- Add index on expert_profiles for common queries
CREATE INDEX IF NOT EXISTS idx_expert_profiles_categories ON expert_profiles USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_expertise ON expert_profiles USING GIN(expertise_tags);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_created ON expert_profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_onboarding ON expert_profiles(onboarding_completed) WHERE onboarding_completed = true;
```

### Increase Client Timeout
Edit your Supabase client config:

```typescript
// src/integrations/supabase/client.ts
const fetchWithTimeout = (url: string | URL | Request, options: RequestInit = {}) => {
  const timeout = 60000; // Increase from 30s to 60s
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(id);
  });
};
```

---

## Quick Fix: Bypass Network Restrictions

### Option 1: Use Cloudflare WARP (Free VPN)
1. Download: https://1.1.1.1/
2. Install and enable WARP
3. Test connection again

### Option 2: Use ngrok (For Development)
```powershell
# Install ngrok
choco install ngrok

# Start ngrok tunnel
ngrok http 5173

# Access via ngrok URL (bypasses local network)
```

### Option 3: Use Vercel Preview Deployment
```powershell
# Deploy to Vercel
npm run build
vercel --prod

# Access via Vercel URL (bypasses local restrictions)
```

---

## Testing Checklist

Run through this checklist:

- [ ] DNS resolves: `nslookup hnevrdlcqhmsfubakljg.supabase.co`
- [ ] Port 443 open: `Test-NetConnection -Port 443 -ComputerName hnevrdlcqhmsfubakljg.supabase.co`
- [ ] VPN disabled
- [ ] Firewall temporarily disabled (for testing)
- [ ] Antivirus temporarily disabled (for testing)
- [ ] Tested on mobile hotspot
- [ ] Browser cache cleared (Ctrl+Shift+Delete)
- [ ] Project shows ACTIVE in Supabase dashboard
- [ ] Can access Supabase Dashboard: https://supabase.com/dashboard/project/hnevrdlcqhmsfubakljg

---

## Emergency Workaround: Use Mock Data

If you can't resolve the network issue immediately, enable mock data:

```bash
# Edit .env
VITE_USE_MOCK_DATA=true
```

This will use local mock data instead of Supabase (for development only).

---

## Next Steps

1. **Run the diagnostic script:**
   ```powershell
   .\diagnose-and-fix-supabase.ps1
   ```

2. **Apply security fixes:**
   ```bash
   # Push the migration to fix security warnings
   supabase db push
   ```

3. **Test connection from browser:**
   - Open `test-supabase-health.html` in browser
   - Click "Run Connection Tests"
   - Share results

4. **Check browser console:**
   - Press F12
   - Go to Console tab
   - Look for specific error messages
   - Share screenshot if needed

---

## Contact Support

If none of these solutions work:

1. **Supabase Support:**
   - Email: support@supabase.com
   - Include Project ID: `hnevrdlcqhmsfubakljg`
   - Include error screenshots

2. **Network Admin:**
   - Request whitelist for `*.supabase.co`
   - Provide documentation: https://supabase.com/docs/guides/platform/network-restrictions

---

**Last Updated:** February 25, 2026  
**Your Project:** DEMatepeak (hnevrdlcqhmsfubakljg)  
**Region:** AWS us-east-2  
**Status:** ACTIVE
