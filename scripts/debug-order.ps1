$BASE = "http://localhost:3004"
$s = New-Object Microsoft.PowerShell.Commands.WebRequestSession

Write-Host "=== STEP 1: LOGIN ===" -ForegroundColor Cyan
$r = Invoke-WebRequest -Uri "$BASE/api/auth" -Method POST -Body '{"username":"admin","password":"admin123"}' -ContentType "application/json" -UseBasicParsing -TimeoutSec 10 -SessionVariable s
Write-Host ("Login: {0} Role: {1}" -f $r.StatusCode, (($r.Content|ConvertFrom-Json).role)) -ForegroundColor Green
Write-Host "Cookies:" -ForegroundColor Gray
$s.Cookies.GetCookies("http://localhost:3004/api/orders") | ForEach-Object { Write-Host ("  {0} = '{1}'" -f $_.Name, $_.Value) }

Write-Host "`n=== STEP 2: CREATE ORDER ===" -ForegroundColor Cyan
$items = @(@{mealId="cmq1b2gmw002asyi062bg3rrz";mealTitle="Water";mealTitleAr="";price=20;quantity=1;category="Beverages";preparationArea="HALL";addOns=@();imageUrl=""})
$body = @{type="TAKEAWAY";customerName="Debug";customerPhone="01999888001";isStaff=$true;items=$items;subtotal=20;serviceCharge=0;deliveryFee=0;total=20}
$bodyJson = $body | ConvertTo-Json -Compress -Depth 10
Write-Host ("Sending: {0}" -f $bodyJson) -ForegroundColor Gray

try {
    $r2 = Invoke-WebRequest -Uri "$BASE/api/orders" -Method POST -Body $bodyJson -ContentType "application/json" -UseBasicParsing -TimeoutSec 30 -WebSession $s
    Write-Host ("Order OK: {0} {1}" -f $r2.StatusCode, $r2.Content) -ForegroundColor Green
} catch {
    $ex = $_.Exception
    $sc = $ex.Response.StatusCode.value__
    try { $sr = [System.IO.StreamReader]::new($ex.Response.GetResponseStream()); $eb = $sr.ReadToEnd(); $sr.Close() } catch { $eb = "NO BODY" }
    Write-Host ("Order FAIL: {0} {1}" -f $sc, $eb) -ForegroundColor Red
}

Write-Host "`n=== STEP 3: CREATE ORDER WITHOUT isStaff ===" -ForegroundColor Cyan
$body2 = @{type="TAKEAWAY";customerName="Debug2";customerPhone="01999888002";isStaff=$false;items=$items;subtotal=20;serviceCharge=0;deliveryFee=0;total=20}
$bodyJson2 = $body2 | ConvertTo-Json -Compress -Depth 10
try {
    $r3 = Invoke-WebRequest -Uri "$BASE/api/orders" -Method POST -Body $bodyJson2 -ContentType "application/json" -UseBasicParsing -TimeoutSec 30 -WebSession $s
    Write-Host ("Order2 OK: {0} {1}" -f $r3.StatusCode, $r3.Content) -ForegroundColor Green
} catch {
    $ex = $_.Exception
    $sc = $ex.Response.StatusCode.value__
    try { $sr = [System.IO.StreamReader]::new($ex.Response.GetResponseStream()); $eb = $sr.ReadToEnd(); $sr.Close() } catch { $eb = "NO BODY" }
    Write-Host ("Order2 FAIL: {0} {1}" -f $sc, $eb) -ForegroundColor Red
}
