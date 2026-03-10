# Browser Connectivity Troubleshooting Guide

## Issue: Browser cannot connect to Supabase (hnevrdlcqhmsfubakljg.supabase.co)
## Symptoms: ERR_CONNECTION_TIMED_OUT, mentors not loading

---

## Quick Fixes (Try in Order)

### 1. DNS Resolution Issue
**Problem:** Your computer can't resolve the Supabase domain

**Fix:**
1. Open Command Prompt (cmd.exe) as Administrator
2. Run these commands:
```cmd
ipconfig /flushdns
ipconfig /release
ipconfig /renew
```

3. Test if DNS works:
```cmd
nslookup hnevrdlcqhmsfubakljg.supabase.co
```

**Expected:** Should return an IP address (like 54.x.x.x)
**If fails:** DNS is blocked

---

### 2. Windows Firewall Blocking
**Problem:** Windows Firewall is blocking Supabase connections

**Fix:**
1. Press Win + R, type: `control firewall.cpl`
2. Click "Advanced settings"
3. Click "Outbound Rules" → "New Rule"
4. Type: Custom → Next
5. Program: All programs → Next
6. Protocol: Any → Next
7. Remote IP: Any → Next
8. Action: Allow → Next
9. Profile: All checked → Next
10. Name: "Allow Supabase" → Finish

---

### 3. Antivirus/Security Software
**Problem:** Antivirus is blocking HTTPS to Supabase

**Fix:**
- Temporarily disable antivirus (right-click tray icon → Disable)
- Try loading http://localhost:8080 again
- If works: Add supabase.co to antivirus whitelist

---

### 4. VPN Interference
**Problem:** VPN is routing traffic through blocked network

**Fix:**
- Disconnect VPN completely
- Try loading app again
- Or: Configure VPN to exclude *.supabase.co

---

### 5. Browser Cache/Extensions
**Problem:** Browser extensions blocking requests

**Fix:**
1. Open browser in Incognito/Private mode (Ctrl+Shift+N)
2. Go to http://localhost:8080
3. Check if mentors load

**If works in incognito:**
- Clear browser cache (Ctrl+Shift+Delete)
- Disable extensions one by one to find culprit

---

### 6. Hosts File Check
**Problem:** Hosts file redirecting Supabase domain

**Fix:**
1. Open as Admin: `C:\Windows\System32\drivers\etc\hosts`
2. Look for line with "supabase.co"
3. Delete or comment out (add # at start)
4. Save and restart browser

---

### 7. Try Different Browser
- Chrome not working? Try Firefox or Edge
- Tests if issue is browser-specific

---

### 8. Corporate Network/Proxy
**Problem:** Corporate proxy blocking Supabase

**Fix:**
- Switch to mobile hotspot temporarily
- Or: Contact IT to whitelist *.supabase.co

---

### 9. Check System Date/Time
**Problem:** Clock out of sync breaks SSL certificates

**Fix:**
1. Right-click clock → "Adjust date/time"
2. Turn on "Set time automatically"
3. Restart browser

---

## Test After Each Fix

**Browser Console Test:**
```javascript
fetch('https://hnevrdlcqhmsfubakljg.supabase.co/rest/v1/')
  .then(r => console.log('✅ CONNECTED! Status:', r.status))
  .catch(e => console.error('❌ Still blocked:', e.message));
```

**PowerShell Test:**
```powershell
Test-NetConnection -ComputerName hnevrdlcqhmsfubakljg.supabase.co -Port 443
```

**Expected:** TcpTestSucceeded : True

---

## Still Not Working?

### Last Resort Options:

1. **Use Supabase Local Development:**
   ```powershell
   npx supabase start
   ```
   Then update .env to use localhost

2. **Check Router/Modem:**
   - Restart router
   - Check if ISP is blocking cloud services

3. **Windows Network Reset:**
   Settings → Network & Internet → Status → Network reset

---

## Most Common Solution

**90% of cases:** Firewall or Antivirus blocking
**Quick test:** Disable Windows Defender Firewall temporarily to confirm
