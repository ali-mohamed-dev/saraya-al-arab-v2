$BASE = "http://localhost:3000"
$pass = 0; $fail = 0

function DoGet($p) { try { Invoke-WebRequest -Uri "$BASE$p" -UseBasicParsing -TimeoutSec 20 } catch { $_.Exception.Response } }
function DoPost($p,$b) { try { Invoke-WebRequest -Uri "$BASE$p" -Method POST -Body ($b|ConvertTo-Json -Compress) -ContentType "application/json" -UseBasicParsing -TimeoutSec 20 } catch { $_.Exception.Response } }
function DoPut($p,$b) { try { Invoke-WebRequest -Uri "$BASE$p" -Method PUT -Body ($b|ConvertTo-Json -Compress) -ContentType "application/json" -UseBasicParsing -TimeoutSec 20 } catch { $_.Exception.Response } }
function DoDel($p) { try { Invoke-WebRequest -Uri "$BASE$p" -Method DELETE -UseBasicParsing -TimeoutSec 20 } catch { $_.Exception.Response } }

function T($n,$e,$a) { if ($e -eq $a) { Write-Host "  ✅ $n" -ForegroundColor Green; $script:pass++ } else { Write-Host "  ❌ $n (got $a, expected $e)" -ForegroundColor Red; $script:fail++ } }

Write-Host "========== SMOKE TEST ==========" -ForegroundColor Cyan

# 1 - READ
Write-Host "`n── READ ──" -ForegroundColor Yellow
$r = DoGet "/api/ping"; T "GET ping" 200 $r.StatusCode
$r = DoGet "/api/meals"; T "GET meals" 200 $r.StatusCode
$meals = if ($r.StatusCode -eq 200) { try { $r.Content | ConvertFrom-Json } catch {} } else { $null }
T "Meals count > 0" $true ($meals -is [array] -and $meals.Count -gt 0)
$firstMeal = if ($meals -is [array] -and $meals.Count -gt 0) { $meals[0] } else { $null }
T "GET categories" 200 (DoGet "/api/categories").StatusCode
T "GET promotions" 200 (DoGet "/api/promotions").StatusCode
T "GET addons" 200 (DoGet "/api/addons").StatusCode
T "GET tables" 200 (DoGet "/api/tables").StatusCode
T "GET staff" 200 (DoGet "/api/staff").StatusCode
T "GET web-users" 200 (DoGet "/api/web-users").StatusCode
T "GET settings" 200 (DoGet "/api/settings").StatusCode
T "GET loyalty" 200 (DoGet "/api/settings/loyalty").StatusCode
$r = DoGet "/api/shifts?current=true"; T "GET current shift" 200 $r.StatusCode
$shift = if ($r.StatusCode -eq 200) { try { $r.Content | ConvertFrom-Json } catch {} } else { $null }
T "Shift is OPEN" "OPEN" $shift.status
T "GET orders" 200 (DoGet "/api/orders").StatusCode
T "GET orders/stats" 200 (DoGet "/api/orders/stats").StatusCode
T "GET expenses" 200 (DoGet "/api/expenses").StatusCode
T "GET expense cats" 200 (DoGet "/api/expenses/categories").StatusCode
T "GET employees" 200 (DoGet "/api/employees").StatusCode
T "GET discounts rpt" 200 (DoGet "/api/reports/discounts?from=2026-06-01&to=2026-06-12").StatusCode

# 2 - AUTH
Write-Host "`n── Auth ──" -ForegroundColor Yellow
T "Auth bad creds → 401" 401 (DoPost "/api/auth" @{username="admin";password="wrong"}).StatusCode
T "Web user check" 200 (DoPost "/api/web-users/check" @{email="186alo.hag@gmail.com"}).StatusCode

# 3 - SETTINGS
Write-Host "`n── Settings ──" -ForegroundColor Yellow
T "PUT loyalty" 200 (DoPut "/api/settings/loyalty" @{loyaltyEnabled=$true;loyaltyThreshold=10;loyaltyCashback=1}).StatusCode
T "PUT takingOrders" 200 (DoPut "/api/settings" @{takingOrders=$true}).StatusCode

# 4 - EXPENSE CATEGORIES
Write-Host "`n── Expense Cats ──" -ForegroundColor Yellow
$r = DoPost "/api/expenses/categories" @{name="__TestCat__"}; T "POST cat → 201" 201 $r.StatusCode
if ($r.StatusCode -eq 201 -and $r.Content) { $catId = try { ($r.Content|ConvertFrom-Json).id } catch {} } else { $catId = $null }
if ($catId) {
    T "PUT cat" 200 (DoPut "/api/expenses/categories/$catId" @{name="__Renamed__"}).StatusCode
    T "DEL cat" 200 (DoDel "/api/expenses/categories/$catId").StatusCode
}

# 5 - EXPENSES
Write-Host "`n── Expenses ──" -ForegroundColor Yellow
$r = DoPost "/api/expenses" @{title="__TestExp__";amount=100;category="إيجار";addedBy="admin"}; T "POST → 201" 201 $r.StatusCode
if ($r.StatusCode -eq 201 -and $r.Content) { $expId = try { ($r.Content|ConvertFrom-Json).id } catch {} } else { $expId = $null }
if ($expId) {
    T "PUT expense" 200 (DoPut "/api/expenses/$expId" @{title="__TestUpd__";amount=200;category="إيجار"}).StatusCode
    T "DEL expense" 200 (DoDel "/api/expenses/$expId").StatusCode
}

# 6 - ORDER LIFECYCLE
Write-Host "`n── Orders ──" -ForegroundColor Yellow
$orderId = $null
if ($firstMeal) {
    $sub = $firstMeal.price * 2
    $body = @{type="TAKEAWAY";customerName="Test";customerPhone="01234567890";customerEmail="186alo.hag@gmail.com";isStaff=$true;items=@(@{mealId=$firstMeal.id;mealTitle=$firstMeal.title;mealTitleAr="";price=$firstMeal.price;quantity=2;category="";preparationArea="KITCHEN";addOns=@();imageUrl=""});subtotal=$sub;serviceCharge=0;deliveryFee=0;total=$sub}
    $r = DoPost "/api/orders" $body; T "POST order → 201" 201 $r.StatusCode
    if ($r.StatusCode -eq 201 -and $r.Content) {
        $order = try { $r.Content | ConvertFrom-Json } catch {}
        $orderId = $order.id
        T "Order number > 0" $true ($order.orderNumber -gt 0)
        T "GET by ID" 200 (DoGet "/api/orders/$orderId").StatusCode
        foreach ($st in @("CONFIRMED","PREPARING","READY","READY_TO_PAY")) {
            T "→ $st" 200 (DoPut "/api/orders/$orderId/status" @{status=$st}).StatusCode
        }
        T "→ DELIVERED" 200 (DoPut "/api/orders/$orderId" @{status="DELIVERED"}).StatusCode
    }
}

# 7 - MEAL ADDONS
Write-Host "`n── Meal Addons ──" -ForegroundColor Yellow
if ($firstMeal) { T "GET addons" 200 (DoGet "/api/meals/$($firstMeal.id)/addons").StatusCode }

# 8 - DATA INTEGRITY
Write-Host "`n── Data ──" -ForegroundColor Yellow
if ($meals -is [array]) {
    T "All meals have id" $true (($meals|Where-Object{$null -eq $_.id}).Count -eq 0)
    T "All prices >= 0" $true (($meals|Where-Object{$_.price -lt 0 -or $null -eq $_.price}).Count -eq 0)
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  $pass passed, $fail failed" -ForegroundColor $(if ($fail -eq 0){"Green"}else{"Red"})
Write-Host "========================================" -ForegroundColor Cyan
if ($fail -gt 0) { exit 1 }
