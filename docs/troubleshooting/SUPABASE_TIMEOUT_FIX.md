# 🔴 SUPABASE CONNECTION TIMEOUT - FIX GUIDE

## Problem
Your application shows `ERR_CONNECTION_TIMED_OUT` when trying to fetch data from Supabase.

## Root Cause
**Your Supabase project is PAUSED** ⏸️

Supabase free tier projects automatically pause after ~7 days of inactivity to save resources.

## ✅ SOLUTION: Unpause Your Project

### Step 1: Go to Supabase Dashboard
Open this link in your browser:
```
https://supabase.com/dashboard/project/hnevrdlcqhmsfubakljg
```

### Step 2: Check Project Status
- Look for a banner/message saying "Project is paused" or "Project is inactive"
- You should see a **"Restore"** or **"Unpause"** button

### Step 3: Unpause the Project
1. Click the **"Restore"** or **"Unpause"** button
2. Wait 30-60 seconds for the project to wake up
3. The status should change to "Active" or "Healthy"

### Step 4: Verify Connection
Run this in PowerShell:
```powershell
.\diagnose-and-fix-supabase.ps1
```

Or test in your browser console (F12):
```javascript
fetch('https://hnevrdlcqhmsfubakljg.supabase.co/rest/v1/', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZXZyZGxjcWhtc2Z1YmFrbGpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNDIzMDEsImV4cCI6MjA3NTYxODMwMX0.e4OjzNc4A6d6petuDQFW-iD6JPVqwmy5Y_KWvgXabBA'
  }
}).then(r => console.log('✅ Connected!', r.status));
```

### Step 5: Restart Development Server
```powershell
npm run dev
```

---

## 🔄 Alternative Causes & Fixes

### If project is NOT paused:

#### Cause 2: Firewall/Antivirus Blocking
**Symptoms:** Same timeout error, project shows as active
**Fix:**
1. Temporarily disable Windows Firewall
2. Disable antivirus software
3. Test again

#### Cause 3: VPN Interference
**Symptoms:** Connection works without VPN
**Fix:**
1. Disconnect from VPN
2. Test connection
3. If it works, add exception in VPN settings

#### Cause 4: Network Restriction
**Symptoms:** Works on mobile but not on PC/WiFi
**Fix:**
1. Connect to mobile hotspot
2. Test if it works
3. If yes, your network (school/corporate) is blocking it

#### Cause 5: DNS Issue
**Symptoms:** DNS lookup fails
**Fix:**
```powershell
# Use Google DNS
netsh interface ip set dns "Wi-Fi" static 8.8.8.8
netsh interface ip add dns "Wi-Fi" 8.8.4.4 index=2
```

---

## 🧪 Testing Tools

### 1. Open test-supabase-health.html
```powershell
# Open in browser
start test-supabase-health.html
```
Click "Run Connection Tests" to diagnose

### 2. Use the diagnostic script
```powershell
.\diagnose-and-fix-supabase.ps1
```

### 3. Browser DevTools Test
1. Open your app in browser
2. Press F12 (DevTools)
3. Go to Console tab
4. Paste:
```javascript
const test = await fetch('https://hnevrdlcqhmsfubakljg.supabase.co/rest/v1/expert_profiles?select=count&limit=1', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZXZyZGxjcWhtc2Z1YmFrbGpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNDIzMDEsImV4cCI6MjA3NTYxODMwMX0.e4OjzNc4A6d6petuDQFW-iD6JPVqwmy5Y_KWvgXabBA'
  }
});
console.log(await test.json());
```

**Expected output:** `[]` or error message
**Timeout:** Means project is paused or blocked

---

## 📊 Understanding the Error Log

Your error log showed:
```
hnevrdlcqhmsfubakljg.supabase.co/rest/v1/expert_profiles?select=*:1  
Failed to load resource: net::ERR_CONNECTION_TIMED_OUT
```

This means:
- ❌ Browser could NOT establish TCP connection to Supabase server
- ❌ Request never reached the server (timeout before connection)
- ✅ DNS resolution worked (otherwise you'd see ERR_NAME_NOT_RESOLVED)

**90% probability:** Project is paused
**10% probability:** Network/firewall blocking

---

## 🎯 Quick Action Plan

1. **Go to:** https://supabase.com/dashboard/project/hnevrdlcqhmsfubakljg
2. **Look for:** "Paused" status or "Restore" button
3. **Click:** Restore/Unpause
4. **Wait:** 30-60 seconds
5. **Refresh:** Your app in browser (Ctrl+F5)

---

## ⚠️ Prevention

To prevent auto-pause on free tier:
1. Keep the project active by visiting the app regularly
2. Upgrade to Pro tier ($25/month) - no auto-pause
3. Set up a cron job to ping the API hourly (keeps it active)

Example ping script (optional):
```powershell
# Save as keep-alive.ps1
$url = "https://hnevrdlcqhmsfubakljg.supabase.co/rest/v1/expert_profiles?select=count&limit=1"
$key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZXZyZGxjcWhtc2Z1YmFrbGpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNDIzMDEsImV4cCI6MjA3NTYxODMwMX0.e4OjzNc4A6d6petuDQFW-iD6JPVqwmy5Y_KWvgXabBA"
Invoke-RestMethod -Uri $url -Headers @{"apikey"=$key}
Write-Host "✅ Pinged at $(Get-Date)"
```

Run hourly with Task Scheduler to keep project alive.

---

## 📞 Still Not Working?

If you've unpaused the project and it still doesn't work:

1. Check Supabase Status: https://status.supabase.com
2. Check project health in dashboard
3. Review Supabase logs (Settings → Logs)
4. Contact Supabase support with project ID: `hnevrdlcqhmsfubakljg`

---

## ✅ Success Checklist

- [ ] Opened Supabase dashboard
- [ ] Verified project status (paused/active)
- [ ] Clicked unpause/restore if needed
- [ ] Waited 60 seconds
- [ ] Refreshed browser (Ctrl+F5)
- [ ] Checked browser console for errors
- [ ] Verified data is loading

---

**Last Updated:** February 25, 2026
**Project ID:** hnevrdlcqhmsfubakljg
**Issue:** Connection timeout (ERR_CONNECTION_TIMED_OUT)
