# PowerShell script to test server connection
# Run: .\test-connection-windows.ps1

Write-Host "=== Server Connection Test ===" -ForegroundColor Cyan
Write-Host ""

# Get local IP addresses
Write-Host "Your network IP addresses:" -ForegroundColor Yellow
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike "127.*"} | ForEach-Object {
    Write-Host "  - $($_.IPAddress)" -ForegroundColor Green
}

Write-Host ""
Write-Host "ESP32 is trying to connect to: http://172.20.10.4:5000" -ForegroundColor Yellow
Write-Host ""

# Test if server is running
Write-Host "Testing server connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/esp32/public/room" -Method GET -TimeoutSec 3 -ErrorAction Stop
    Write-Host "✅ Server is running on localhost:5000" -ForegroundColor Green
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Server is NOT running on localhost:5000" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "👉 Start the server:" -ForegroundColor Yellow
    Write-Host "   cd backend" -ForegroundColor White
    Write-Host "   npm start" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "Testing server on 172.20.10.4..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://172.20.10.4:5000/api/esp32/public/room" -Method GET -TimeoutSec 3 -ErrorAction Stop
    Write-Host "✅ Server is accessible on 172.20.10.4:5000" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Server might not be accessible on 172.20.10.4" -ForegroundColor Yellow
    Write-Host "   This could be a firewall issue" -ForegroundColor Yellow
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Make sure server is running: cd backend && npm start" -ForegroundColor White
Write-Host "2. Check Windows Firewall allows port 5000" -ForegroundColor White
Write-Host "3. Verify your computer's IP is actually 172.20.10.4" -ForegroundColor White
Write-Host ""

