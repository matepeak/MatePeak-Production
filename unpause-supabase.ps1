# Quick Fix: Open Supabase Dashboard to Unpause Project

Write-Host "Opening Supabase Dashboard..." -ForegroundColor Cyan
Write-Host "Action Required: Click the RESTORE or UNPAUSE button if you see one" -ForegroundColor Yellow
Write-Host ""

# Open Supabase dashboard
Start-Process "https://supabase.com/dashboard/project/hnevrdlcqhmsfubakljg"

Write-Host "What to do:" -ForegroundColor Cyan
Write-Host "1. Look for Project is paused message" -ForegroundColor White
Write-Host "2. Click Restore or Unpause button" -ForegroundColor White
Write-Host "3. Wait 30-60 seconds for project to wake up" -ForegroundColor White
Write-Host "4. Refresh your app with Ctrl+F5" -ForegroundColor White
Write-Host ""
Write-Host "After unpausing, restart your dev server:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
