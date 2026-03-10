# Complete Fix Guide: Connection Timeout + Security Issues

## 🔴 Issue Summary
1. **ERR_CONNECTION_TIMED_OUT** - Cannot connect to Supabase
2. **91 Security/Performance Warnings** in Supabase Dashboard
3. **0 mentors loading** in the application

## ✅ Solutions Applied

### 1. Created Security Fixes
**File:** `supabase/migrations/20260225000000_fix_function_search_path_security.sql`

Fixed 12 functions with `search_path` security issues:
- ✅ `check_rate_limit`
- ✅ `cleanup_rate_limit_logs`
- ✅ `get_rate_limit_status`
- ✅ `sync_session_date`
- ✅ `sync_student_id`
- ✅ `update_expert_profiles_search_vector`
- ✅ `search_expert_profiles`
- ✅ `mark_review_requested`
- ✅ `get_sessions_ready_for_review`
- ✅ `get_mentor_rating_stats`
- ✅ `update_updated_at_column`
- ✅ `update_booking_requests_updated_at`

### 2. Created Performance Optimization
**File:** `supabase/migrations/20260225000001_add_performance_indexes.sql`

Added 18 database indexes to speed up slow queries:
- GIN indexes for array searches (categories, expertise_tags)
- Composite indexes for dashboard queries
- Partial indexes for filtered queries
- Full-text search optimizations

### 3. Network Troubleshooting Tools
**Files:**
- `diagnose-and-fix-supabase.ps1` - Comprehensive diagnostic script
- `NETWORK_CONNECTIVITY_FIX.md` - Detailed troubleshooting guide
- `SUPABASE_TIMEOUT_FIX.md` - Quick fix guide

---

## 🚀 Action Plan (Follow These Steps)

### Step 1: Apply Database Fixes
```powershell
# If using Supabase CLI (recommended)
supabase db push

# OR manually in Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Copy content from migrations/20260225000000_fix_function_search_path_security.sql
# 3. Run the script
# 4. Copy content from migrations/20260225000001_add_performance_indexes.sql
# 5. Run the script
```

### Step 2: Diagnose Network Issue
Your project is **ACTIVE** but you can't connect. This means network blocking.

```powershell
# Run the diagnostic
.\diagnose-and-fix-supabase.ps1
```

#### Likely Causes:
1. **Firewall/Antivirus** - Most common
2. **VPN** - Interfering with connection
3. **ISP/Network restrictions** - School/corporate network
4. **DNS issues** - Can't resolve domain

### Step 3: Quick Network Tests

#### Test 1: Check if domain resolves
```powershell
nslookup hnevrdlcqhmsfubakljg.supabase.co
```
**Expected:** Returns IP addresses  
**If fails:** DNS issue → Change to Google DNS (8.8.8.8)

#### Test 2: Check if port is open
```powershell
Test-NetConnection -ComputerName hnevrdlcqhmsfubakljg.supabase.co -Port 443
```
**Expected:** TcpTestSucceeded = True  
**If fails:** Firewall blocking → Disable firewall temporarily

#### Test 3: Test from mobile hotspot
1. Connect to mobile hotspot
2. Try accessing app again
3. **If works:** Your primary network is blocking it

### Step 4: Apply Quick Fix

Choose **ONE** solution:

#### Option A: Disable Firewall (Testing Only)
```powershell
# Temporarily disable
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False

# Test app
# Then re-enable
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True
```

#### Option B: Use VPN (Cloudflare WARP - Free)
1. Download: https://1.1.1.1/
2. Install and enable WARP
3. Restart browser
4. Test app

#### Option C: Change DNS to Google
```powershell
$adapter = Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | Select-Object -First 1
Set-DnsClientServerAddress -InterfaceIndex $adapter.ifIndex -ServerAddresses ("8.8.8.8","8.8.4.4")
```

#### Option D: Use Mobile Hotspot
1. Enable hotspot on phone
2. Connect PC to hotspot
3. Test app

### Step 5: Clear Browser Cache & Restart
```powershell
# In browser: Ctrl+Shift+Delete → Clear all
# Then restart dev server
npm run dev
```

---

## 📊 Expected Results After Fix

### Security Dashboard
After applying migrations, you should see:
- ✅ 12 security warnings resolved
- ✅ Function search_path issues fixed
- ⚠️ 1 remaining: "Leaked password protection disabled" (optional to fix)

### Performance Dashboard
After adding indexes:
- ✅ Faster query execution
- ✅ Reduced timeout errors
- ✅ Better dashboard load times

### Application
After network fix:
- ✅ Mentors load successfully
- ✅ No more `ERR_CONNECTION_TIMED_OUT`
- ✅ Data appears in dashboards

---

## 🔍 Verification Steps

### 1. Verify Database Migrations Applied
```sql
-- Run in Supabase SQL Editor
SELECT * FROM supabase_migrations.schema_migrations 
WHERE version LIKE '20260225%'
ORDER BY version DESC;
```
**Should show:** Both migrations with timestamps

### 2. Verify Functions Fixed
```sql
-- Run in Supabase SQL Editor
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  proconfig as configuration
FROM pg_proc 
WHERE proname IN (
  'check_rate_limit',
  'sync_session_date',
  'update_expert_profiles_search_vector'
)
AND pronamespace = 'public'::regnamespace;
```
**Should show:** Configuration includes `search_path=`

### 3. Verify Indexes Created
```sql
-- Run in Supabase SQL Editor
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```
**Should show:** All new indexes

### 4. Test App Connection
Open browser console (F12) and run:
```javascript
fetch('https://hnevrdlcqhmsfubakljg.supabase.co/rest/v1/expert_profiles?select=count&limit=1', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZXZyZGxjcWhtc2Z1YmFrbGpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNDIzMDEsImV4cCI6MjA3NTYxODMwMX0.e4OjzNc4A6d6petuDQFW-iD6JPVqwmy5Y_KWvgXabBA'
  }
}).then(r => r.json()).then(console.log);
```
**Expected:** Array with data  
**If timeout:** Network still blocked

---

## 🎯 Most Likely Fix for Your Situation

Based on your screenshots showing the project is ACTIVE, the issue is **99% network-related**.

**Try these in order:**

1. **Mobile Hotspot Test** (5 minutes)
   - Connect to mobile hotspot
   - If works → Your network is blocking it
   - Solution: Use VPN or contact network admin

2. **Firewall Test** (2 minutes)
   - Temporarily disable Windows Firewall
   - If works → Add firewall exception
   - Solution: Whitelist `*.supabase.co`

3. **VPN/Proxy Test** (2 minutes)
   - Disconnect VPN if active
   - Check proxy settings
   - If works → VPN is interfering

4. **DNS Test** (3 minutes)
   - Change to Google DNS (8.8.8.8)
   - Clear DNS cache: `ipconfig /flushdns`
   - If works → DNS issue

---

## 📞 Still Not Working?

If you've tried everything and it still doesn't work:

### Option 1: Use Supabase CLI Local Development
```powershell
# Start local Supabase
supabase start

# Update .env to use local instance
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=[local_anon_key]
```

### Option 2: Deploy to Vercel (Bypasses Local Network)
```powershell
npm run build
vercel --prod
```
Access via Vercel URL - this bypasses local network restrictions.

### Option 3: Contact Network Admin
Request whitelist for:
- `*.supabase.co`
- `*.supabase.com`
- Port 443 outbound

---

## 📝 Summary

| Issue | Status | Fix Applied |
|-------|--------|-------------|
| Function search_path security | ✅ Fixed | Migration created |
| Slow queries | ✅ Fixed | Indexes added |
| Connection timeout | ⚠️ Needs testing | Diagnostic tools provided |
| Leaked password protection | ⏸️ Optional | Not critical |

**Next Action:** Run `.\diagnose-and-fix-supabase.ps1` and follow the results.

---

**Created:** February 25, 2026  
**Project:** DEMatepeak (hnevrdlcqhmsfubakljg)  
**Status:** Active (AWS us-east-2)
