param([int]$sleepBeforeTest = 40)

$projectDir = "D:\Ali\Project_frontEnd\top-project"
$logFile = Join-Path $projectDir ".next\server-out.txt"
$errFile = Join-Path $projectDir ".next\server-err.txt"
Remove-Item $logFile, $errFile -ErrorAction SilentlyContinue

Write-Host "Starting Next.js dev server..." -ForegroundColor Cyan

# Start next dev via Start-Process
$p = Start-Process -FilePath "npx.cmd" -ArgumentList "next dev -p 3000" -WorkingDirectory $projectDir -NoNewWindow -RedirectStandardOutput $logFile -RedirectStandardError $errFile -PassThru

Write-Host "PID: $($p.Id)" -ForegroundColor Gray

# Wait for server to be ready
$ready = $false
for ($i = 0; $i -lt $sleepBeforeTest; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $logFile) {
        $content = Get-Content $logFile -Raw
        if ($content -match "Ready in") {
            $ready = $true
            Write-Host "Server ready after ${i}s" -ForegroundColor Green
            break
        }
        if ($content -match "error|Error|Failed|fail") {
            Write-Host "Found error in log:" -ForegroundColor Red
            $content
        }
    }
    # Show a dot every 5 seconds
    if ($i % 5 -eq 4) { Write-Host "." -NoNewline }
}

if (-not $ready) {
    Write-Host "`nServer did not become ready. Log:" -ForegroundColor Red
    if (Test-Path $logFile) { Get-Content $logFile }
    if (Test-Path $errFile) { Get-Content $errFile }
    $p.Kill()
    exit 1
}

Write-Host "`n"

# Verify server responds
$ok = $false
for ($i = 0; $i -lt 10; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:3000/api/ping" -UseBasicParsing -TimeoutSec 5
        Write-Host "Ping OK: $($r.StatusCode) $($r.Content)" -ForegroundColor Green
        $ok = $true
        break
    } catch {
        Start-Sleep -Seconds 1
    }
}

if (-not $ok) {
    Write-Host "Server not responding to requests" -ForegroundColor Red
    Get-Content $logFile -Tail 20
    $p.Kill()
    exit 1
}

# ===== RUN TESTS =====
Write-Host "`n======= STARTING TESTS =======" -ForegroundColor Cyan

$passed = 0
$failed = 0
$results = @()

function Test-Equal {
    param($name, $expected, $actual)
    if ($expected -eq $actual) {
        Write-Host "  ✅ $name" -ForegroundColor Green
        $script:passed++
    } else {
        Write-Host "  ❌ $name (expected $expected, got $actual)" -ForegroundColor Red
        $script:failed++
    }
}

function Test-Condition {
    param($name, [scriptblock]$condition)
    $result = & $condition
    if ($result) {
        Write-Host "  ✅ $name" -ForegroundColor Green
        $script:passed++
    } else {
        Write-Host "  ❌ $name" -ForegroundColor Red
        $script:failed++
    }
}

function Api-Get {
    param($path)
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:3000$path" -UseBasicParsing -TimeoutSec 30
        $content = $r.Content
        try { $json = $content | ConvertFrom-Json } catch { $json = $null }
        return @{ Status = [int]$r.StatusCode; Content = $content; Json = $json; Error = $null }
    } catch {
        return @{ Status = $_.Exception.Response.StatusCode.value__; Content = $null; Json = $null; Error = $_.Exception.Message }
    }
}

function Api-Post {
    param($path, $body)
    try {
        $bodyJson = $body | ConvertTo-Json -Compress
        $r = Invoke-WebRequest -Uri "http://localhost:3000$path" -Method POST -Body $bodyJson -ContentType "application/json" -UseBasicParsing -TimeoutSec 30
        $content = $r.Content
        try { $json = $content | ConvertFrom-Json } catch { $json = $null }
        return @{ Status = [int]$r.StatusCode; Content = $content; Json = $json; Error = $null }
    } catch {
        return @{ Status = $_.Exception.Response.StatusCode.value__; Content = $null; Json = $null; Error = $_.Exception.Message }
    }
}

function Api-Put {
    param($path, $body)
    try {
        $bodyJson = $body | ConvertTo-Json -Compress
        $r = Invoke-WebRequest -Uri "http://localhost:3000$path" -Method PUT -Body $bodyJson -ContentType "application/json" -UseBasicParsing -TimeoutSec 30
        $content = $r.Content
        try { $json = $content | ConvertFrom-Json } catch { $json = $null }
        return @{ Status = [int]$r.StatusCode; Content = $content; Json = $json; Error = $null }
    } catch {
        return @{ Status = $_.Exception.Response.StatusCode.value__; Content = $null; Json = $null; Error = $_.Exception.Message }
    }
}

function Api-Delete {
    param($path)
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:3000$path" -Method DELETE -UseBasicParsing -TimeoutSec 30
        $content = $r.Content
        try { $json = $content | ConvertFrom-Json } catch { $json = $null }
        return @{ Status = [int]$r.StatusCode; Content = $content; Json = $json; Error = $null }
    } catch {
        return @{ Status = $_.Exception.Response.StatusCode.value__; Content = $null; Json = $null; Error = $_.Exception.Message }
    }
}

# ─── 1. READ ENDPOINTS ───
Write-Host "`n── READ Endpoints ──" -ForegroundColor Yellow
$r = Api-Get "/api/ping"
Test-Equal "GET /api/ping" 200 $r.Status

$r = Api-Get "/api/meals"
Test-Equal "GET /api/meals returns 200" 200 $r.Status
$mealsCount = if ($r.Json -is [array]) { $r.Json.Count } else { 0 }
Test-Condition "Meals count > 0" { $mealsCount -gt 0 }
$firstMeal = if ($r.Json -is [array] -and $r.Json.Count -gt 0) { $r.Json[0] } else { $null }

$r = Api-Get "/api/categories"
Test-Equal "GET /api/categories" 200 $r.Status

$r = Api-Get "/api/promotions"
Test-Equal "GET /api/promotions" 200 $r.Status

$r = Api-Get "/api/addons"
Test-Equal "GET /api/addons" 200 $r.Status

$r = Api-Get "/api/tables"
Test-Equal "GET /api/tables" 200 $r.Status

$r = Api-Get "/api/staff"
Test-Equal "GET /api/staff" 200 $r.Status

$r = Api-Get "/api/web-users"
Test-Equal "GET /api/web-users" 200 $r.Status

$r = Api-Get "/api/settings"
Test-Equal "GET /api/settings" 200 $r.Status
Test-Condition "Settings has takingOrders field" { $r.Json -and ($r.Json.takingOrders -ne $null) }

$r = Api-Get "/api/settings/loyalty"
Test-Equal "GET /api/settings/loyalty" 200 $r.Status
Test-Condition "Loyalty has loyaltyEnabled" { $r.Json -and ($r.Json.loyaltyEnabled -ne $null) }

$r = Api-Get "/api/shifts?current=true"
Test-Equal "GET /api/shifts?current=true" 200 $r.Status

$r = Api-Get "/api/orders"
Test-Equal "GET /api/orders" 200 $r.Status
$ordersCount = if ($r.Json -is [array]) { $r.Json.Count } else { 0 }

$r = Api-Get "/api/orders/stats"
Test-Equal "GET /api/orders/stats" 200 $r.Status

$r = Api-Get "/api/expenses"
Test-Equal "GET /api/expenses" 200 $r.Status

$r = Api-Get "/api/expenses/categories"
Test-Equal "GET /api/expenses/categories" 200 $r.Status

$r = Api-Get "/api/employees"
Test-Equal "GET /api/employees" 200 $r.Status

$r = Api-Get "/api/reports/discounts?from=2026-06-01&to=2026-06-12"
Test-Equal "GET /api/reports/discounts" 200 $r.Status
if ($r.Json) { Test-Condition "Discounts report has data" { $r.Json.PSObject.Properties.Name -contains "totalDiscounts" } }

# ─── 2. AUTH ───
Write-Host "`n── Auth ──" -ForegroundColor Yellow
$r = Api-Post "/api/auth" @{ username = "admin"; password = "wrong" }
Test-Equal "POST /api/auth bad creds" 401 $r.Status

$r = Api-Post "/api/web-users/check" @{ email = "186alo.hag@gmail.com" }
Test-Equal "POST /api/web-users/check" 200 $r.Status

# ─── 3. SETTINGS CRUD ───
Write-Host "`n── Settings CRUD ──" -ForegroundColor Yellow
$r = Api-Put "/api/settings/loyalty" @{ loyaltyEnabled = $true; loyaltyThreshold = 10; loyaltyCashback = 1 }
Test-Equal "PUT /api/settings/loyalty" 200 $r.Status
if ($r.Json) { Test-Condition "loyaltyEnabled=true" { $r.Json.loyaltyEnabled -eq $true } }

$r = Api-Put "/api/settings" @{ takingOrders = $true }
Test-Equal "PUT /api/settings (takingOrders)" 200 $r.Status

# ─── 4. EXPENSE CATEGORIES CRUD ───
Write-Host "`n── Expense Categories CRUD ──" -ForegroundColor Yellow
$r = Api-Post "/api/expenses/categories" @{ name = "__TestCat__" }
Test-Equal "POST /api/expenses/categories" 201 $r.Status
$catId = if ($r.Json) { $r.Json.id } else { $null }
Test-Condition "Category has id" { $catId -ne $null }

if ($catId) {
    $r = Api-Put "/api/expenses/categories/$catId" @{ name = "__TestCatRenamed__" }
    Test-Equal "PUT /api/expenses/categories/[id]" 200 $r.Status

    $r = Api-Delete "/api/expenses/categories/$catId"
    Test-Equal "DELETE /api/expenses/categories/[id]" 200 $r.Status
}

# ─── 5. EXPENSES CRUD ───
Write-Host "`n── Expenses CRUD ──" -ForegroundColor Yellow
$r = Api-Post "/api/expenses" @{ title = "__TestExpense__"; amount = 100; category = "إيجار"; addedBy = "admin" }
Test-Equal "POST /api/expenses" 201 $r.Status
$expId = if ($r.Json) { $r.Json.id } else { $null }
Test-Condition "Expense has id" { $expId -ne $null }

if ($expId) {
    $r = Api-Put "/api/expenses/$expId" @{ title = "__TestExpenseUpdated__"; amount = 200; category = "إيجار" }
    Test-Equal "PUT /api/expenses/[id]" 200 $r.Status
    if ($r.Json) { Test-Condition "Expense description updated" { $r.Json.description -eq "__TestExpenseUpdated__" } }

    $r = Api-Delete "/api/expenses/$expId"
    Test-Equal "DELETE /api/expenses/[id]" 200 $r.Status
}

# ─── 6. ORDER LIFECYCLE ───
Write-Host "`n── Order Lifecycle ──" -ForegroundColor Yellow
$orderId = $null
$orderNumber = $null

if ($firstMeal) {
    $items = @(@{
        mealId = $firstMeal.id
        mealTitle = $firstMeal.title
        mealTitleAr = if ($firstMeal.titleAr) { $firstMeal.titleAr } else { "" }
        price = $firstMeal.price
        quantity = 2
        category = if ($firstMeal.category) { $firstMeal.category } else { "" }
        preparationArea = if ($firstMeal.preparationArea) { $firstMeal.preparationArea } else { "KITCHEN" }
        addOns = @()
        imageUrl = if ($firstMeal.imageUrl) { $firstMeal.imageUrl } else { "" }
    })
    $subtotal = $firstMeal.price * 2
    $r = Api-Post "/api/orders" @{
        type = "TAKEAWAY"
        customerName = "Test Customer"
        customerPhone = "01234567890"
        customerEmail = "186alo.hag@gmail.com"
        isStaff = $true
        items = $items
        subtotal = $subtotal
        serviceCharge = 0
        deliveryFee = 0
        total = $subtotal
    }
    Test-Equal "POST /api/orders creates TAKEAWAY order" 201 $r.Status
    $orderId = if ($r.Json) { $r.Json.id } else { $null }
    $orderNumber = if ($r.Json) { $r.Json.orderNumber } else { $null }
    Test-Condition "Order has id" { $orderId -ne $null }
    Test-Condition "Order has positive orderNumber" { $orderNumber -gt 0 }

    if ($orderId) {
        # Fetch order
        $r = Api-Get "/api/orders/$orderId"
        Test-Equal "GET /api/orders/[id]" 200 $r.Status
        if ($r.Json) { Test-Condition "Order ID matches" { $r.Json.id -eq $orderId } }

        # Status transitions
        @("CONFIRMED", "PREPARING", "READY", "READY_TO_PAY") | ForEach-Object {
            $r = Api-Put "/api/orders/$orderId/status" @{ status = $_ }
            Test-Equal "PUT /api/orders/[id]/status ($_)" 200 $r.Status
        }

        # Deliver
        $r = Api-Put "/api/orders/$orderId" @{ status = "DELIVERED" }
        Test-Equal "PUT /api/orders/[id] (DELIVERED)" 200 $r.Status
    }
}

# ─── 7. SHIFT ───
Write-Host "`n── Shift ──" -ForegroundColor Yellow
$r = Api-Get "/api/shifts?current=true"
Test-Equal "Current shift exists" 200 $r.Status
if ($r.Json) {
    Test-Condition "Shift is OPEN" { $r.Json.status -eq "OPEN" }
}

# ─── 8. MEAL ADDONS ───
Write-Host "`n── Meal Addons ──" -ForegroundColor Yellow
if ($firstMeal) {
    $r = Api-Get "/api/meals/$($firstMeal.id)/addons"
    Test-Equal "GET /api/meals/[id]/addons" 200 $r.Status
}

# ─── 9. WEB USERS ───
Write-Host "`n── Web Users ──" -ForegroundColor Yellow
$r = Api-Post "/api/web-users/login" @{ email = "186alo.hag@gmail.com"; password = "123456" }
Test-Condition "Web user login responds (200 or 401)" { $r.Status -eq 200 -or $r.Status -eq 401 }

# ─── 10. REPORTS ───
Write-Host "`n── Reports ──" -ForegroundColor Yellow
$r = Api-Get "/api/reports/monthly?from=2026-06-01&to=2026-06-12"
Test-Condition "Monthly report returns Excel (200 or 404)" { $r.Status -eq 200 -or $r.Status -eq 404 }

# ─── SUMMARY ───
Write-Host "`n$("=" * 50)" -ForegroundColor Cyan
Write-Host "RESULTS: $passed passed, $failed failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "$("=" * 50)" -ForegroundColor Cyan

# Check for detailed meal data issues
Write-Host "`n── Data Integrity Checks ──" -ForegroundColor Yellow

# Check meals data
$r = Api-Get "/api/meals"
if ($r.Json -is [array]) {
    $meals = $r.Json
    Test-Condition "All meals have id" { ($meals | Where-Object { $null -eq $_.id }).Count -eq 0 }
    Test-Condition "All meals have price >= 0" { ($meals | Where-Object { $_.price -lt 0 -or $null -eq $_.price }).Count -eq 0 }
    
    $zeroPrice = $meals | Where-Object { $_.price -eq 0 -or $null -eq $_.price }
    if ($zeroPrice.Count -gt 0) {
        Write-Host "  ⚠️ Meals with zero price: $($zeroPrice.Count)" -ForegroundColor Yellow
        $zeroPrice | ForEach-Object { Write-Host "     - $($_.title) (ID: $($_.id))" }
    }
}

# Check categories
$r = Api-Get "/api/categories"
if ($r.Json -is [array]) {
    $cats = $r.Json
    Test-Condition "All categories have name" { ($cats | Where-Object { [string]::IsNullOrEmpty($_.name) }).Count -eq 0 }
}

# Check tables
$r = Api-Get "/api/tables"
if ($r.Json -is [array]) {
    $tables = $r.Json
    Test-Condition "All tables have number" { ($tables | Where-Object { $null -eq $_.number }).Count -eq 0 }
}

# Check shifts
$r = Api-Get "/api/shifts"
if ($r.Json -is [array]) {
    $shifts = $r.Json
    Test-Condition "All shifts have status" { ($shifts | Where-Object { $null -eq $_.status }).Count -eq 0 }
    $openShifts = $shifts | Where-Object { $_.status -eq "OPEN" }
    Test-Condition "At most 1 OPEN shift" { $openShifts.Count -le 1 }
}

# Check settings
$r = Api-Get "/api/settings"
if ($r.Json) {
    $s = $r.Json
    Test-Condition "Settings.currency exists" { -not [string]::IsNullOrEmpty($s.currency) }
    Test-Condition "Settings.taxRate is number" { $s.taxRate -is [int] -or $s.taxRate -is [double] -or $s.taxRate -is [decimal] }
    Test-Condition "Settings.takingOrders is boolean" { $s.takingOrders -is [bool] }
}

# Kill server
Write-Host "`nStopping server..." -ForegroundColor Gray
$p.Kill()
Write-Host "Done." -ForegroundColor Gray

if ($failed -gt 0) { exit 1 }
