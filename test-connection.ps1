Write-Host "Testing Supabase connection..." -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri "https://hnevrdlcqhmsfubakljg.supabase.co/rest/v1/" -Method GET -TimeoutSec 5
    Write-Host "✅ SUCCESS! Supabase is online (Status: $($response.StatusCode))" -ForegroundColor Green
    Write-Host "You can now refresh your app!" -ForegroundColor Green
} catch {
    Write-Host "❌ STILL OFFLINE - Connection timed out" -ForegroundColor Red
    Write-Host "Please ensure you've clicked 'Resume Project' in the Supabase dashboard" -ForegroundColor Yellow
}
