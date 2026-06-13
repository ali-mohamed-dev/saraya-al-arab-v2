$BASE = "http://localhost:3004"
$script:pass = 0; $script:fail = 0; $script:session = $null

function G($p) { try { Invoke-WebRequest -Uri "$BASE$p" -UseBasicParsing -TimeoutSec 30 -WebSession $script:session } catch { $_.Exception.Response } }
function P($p,$b) { try { Invoke-WebRequest -Uri "$BASE$p" -Method POST -Body ($b|ConvertTo-Json -Compress -Depth 10) -ContentType "application/json" -UseBasicParsing -TimeoutSec 30 -WebSession $script:session } catch { $_.Exception.Response } }
function U($p,$b) { try { Invoke-WebRequest -Uri "$BASE$p" -Method PUT -Body ($b|ConvertTo-Json -Compress -Depth 10) -ContentType "application/json" -UseBasicParsing -TimeoutSec 30 -WebSession $script:session } catch { $_.Exception.Response } }
function T($n,$e,$a) { if ($e -eq $a) { Write-Host "  OK $n" -ForegroundColor Green; $script:pass++ } else { Write-Host "  FAIL $n (got [$a], expected [$e])" -ForegroundColor Red; $script:fail++ } }
function GT($n,$v) { if ($v) { Write-Host ("  DATA {0}: {1}" -f $n,$v) -ForegroundColor Green; $script:pass++ } else { Write-Host "  MISS $n" -ForegroundColor Red; $script:fail++ } }
function FetchAll($url,$sel) { $r=G $url; if($r.StatusCode-eq200){try{$d=$r.Content|ConvertFrom-Json;if($sel){$d.$sel}else{$d}}catch{$null}}else{$null} }
function Pick($arr,$filter) { $arr|Where-Object{$filter} | Select-Object -First 1 }
function PickById($arr,$id) { $arr|Where-Object{$_.id-eq$id} | Select-Object -First 1 }

$ts = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
$email = "186alo.hag@gmail.com"

Write-Host "=== LOGIN ===" -ForegroundColor Cyan
try {
    $r = Invoke-WebRequest -Uri "$BASE/api/auth" -Method POST -Body '{"username":"admin","password":"admin123"}' -ContentType "application/json" -UseBasicParsing -TimeoutSec 10 -SessionVariable sv
    $script:session = $sv; T "Login" 200 $r.StatusCode
    Write-Host ("Role: {0}" -f (($r.Content|ConvertFrom-Json).role)) -ForegroundColor White
} catch { Write-Host "LOGIN FAIL" -ForegroundColor Red; exit 1 }

Write-Host "=== FETCH DATA ===" -ForegroundColor Cyan
$meals = FetchAll "/api/meals"; GT "Meals" ($meals -is [array] -and $meals.Count -gt 0)
$tables = FetchAll "/api/tables"; GT "Tables" ($tables -is [array] -and $tables.Count -gt 0)

# Pick meals by preparation area
$kitchenMeals = $meals|Where-Object{$_.preparationArea -eq "KITCHEN" -and $_.price -ge 50}
$baristaMeals = $meals|Where-Object{$_.preparationArea -eq "BARISTA" -and $_.price -ge 40}
$hallMeals = $meals|Where-Object{$_.preparationArea -eq "HALL"}

$mKitchen1 = $kitchenMeals[0]; $mKitchen2 = $kitchenMeals[1]; $mKitchen3 = $kitchenMeals[2]
$mBarista = $baristaMeals[0]; $mBarista2 = $baristaMeals[1]
$mHall = $hallMeals[0]
$mKitchen4 = $kitchenMeals[3]; $mKitchen5 = $kitchenMeals[4]

$table1 = $tables[0]; $table2 = $tables[1]

Write-Host ("Using: {0}, {1}, {2}" -f $mKitchen1.title,$mBarista.title,$mHall.title) -ForegroundColor Gray

function MkItem($m,$qty) { return @{mealId=$m.id;mealTitle=$m.title;mealTitleAr=$m.titleAr;price=$m.price;quantity=$qty;category=$m.category;preparationArea=$m.preparationArea;addOns=@();imageUrl=$m.imageUrl} }

# ========== SHIFT 1 ==========
Write-Host "`n============================================" -ForegroundColor Magenta
Write-Host "   SHIFT 1: MORNING" -ForegroundColor Magenta
Write-Host "============================================" -ForegroundColor Magenta

$r = G "/api/shifts?current=true"; T "GET shift" 200 $r.StatusCode
$s1 = try{$r.Content|ConvertFrom-Json}catch{};$S1=$s1.id;GT "S1 ID" $S1;T "S1 OPEN" "OPEN" $s1.status

# O1: DINE_IN T1
Write-Host "`n-- O1: DINE_IN T1 --" -ForegroundColor Yellow
$sub = $mKitchen1.price*1 + $mBarista.price*1 + $mHall.price*2
$r = P "/api/orders" @{type="DINE_IN";tableId=$table1.id;tableNumber=$table1.number;customerName="Ahmed";customerPhone="010$($ts%10000000)1";isStaff=$true;customerEmail=$email;items=@(MkItem $mKitchen1 1;MkItem $mBarista 1;MkItem $mHall 2);subtotal=$sub;serviceCharge=0;deliveryFee=0;total=$sub}
T "POST O1" 201 $r.StatusCode
$o1 = try{$r.Content|ConvertFrom-Json}catch{};$O1=$o1.id;GT "O1#" $o1.orderNumber;T "O1 DINE_IN" "DINE_IN" $o1.type;T "O1 table" $table1.number $o1.tableNumber

# O2: TAKEAWAY
Write-Host "`n-- O2: TAKEAWAY --" -ForegroundColor Yellow
$sub = $mKitchen2.price*2 + $mKitchen3.price*1
$r = P "/api/orders" @{type="TAKEAWAY";customerName="Sara";customerPhone="010$($ts%10000000)2";customerEmail=$email;isStaff=$true;items=@(MkItem $mKitchen2 2;MkItem $mKitchen3 1);subtotal=$sub;serviceCharge=0;deliveryFee=0;total=$sub}
T "POST O2" 201 $r.StatusCode
$o2 = try{$r.Content|ConvertFrom-Json}catch{};$O2=$o2.id;GT "O2#" $o2.orderNumber

# O3: DELIVERY
Write-Host "`n-- O3: DELIVERY --" -ForegroundColor Yellow
$sub = $mKitchen1.price*1 + $mBarista2.price*2; $total = $sub + 30
$r = P "/api/orders" @{type="DELIVERY";customerName="Khaled";customerPhone="010$($ts%10000000)3";customerEmail=$email;deliveryAddress="123 Nile St, Apt 5";isStaff=$true;items=@(MkItem $mKitchen1 1;MkItem $mBarista2 2);subtotal=$sub;serviceCharge=0;deliveryFee=30;total=$total}
T "POST O3" 201 $r.StatusCode
$o3 = try{$r.Content|ConvertFrom-Json}catch{};$O3=$o3.id;GT "O3#" $o3.orderNumber;T "O3 DELIVERY" "DELIVERY" $o3.type

# Process O1
Write-Host "`n-- Process O1 --" -ForegroundColor Yellow
T "CONF" 200 (U "/api/orders/$O1/status" @{status="CONFIRMED"}).StatusCode
T "PREP" 200 (U "/api/orders/$O1/status" @{status="PREPARING"}).StatusCode
T "READY" 200 (U "/api/orders/$O1/status" @{status="READY"}).StatusCode
T "RTP" 200 (U "/api/orders/$O1/status" @{status="READY_TO_PAY"}).StatusCode
T "DELV" 200 (U "/api/orders/$O1" @{status="DELIVERED"}).StatusCode

# Process O2
Write-Host "`n-- Process O2 --" -ForegroundColor Yellow
T "CONF" 200 (U "/api/orders/$O2/status" @{status="CONFIRMED"}).StatusCode
T "PREP" 200 (U "/api/orders/$O2/status" @{status="PREPARING"}).StatusCode
T "READY" 200 (U "/api/orders/$O2/status" @{status="READY"}).StatusCode
T "RTP" 200 (U "/api/orders/$O2/status" @{status="READY_TO_PAY"}).StatusCode
T "DELV" 200 (U "/api/orders/$O2" @{status="DELIVERED"}).StatusCode

# Process O3
Write-Host "`n-- Process O3 --" -ForegroundColor Yellow
T "CONF" 200 (U "/api/orders/$O3/status" @{status="CONFIRMED"}).StatusCode
T "PREP" 200 (U "/api/orders/$O3/status" @{status="PREPARING"}).StatusCode
T "READY" 200 (U "/api/orders/$O3/status" @{status="READY"}).StatusCode
T "RTP" 200 (U "/api/orders/$O3/status" @{status="READY_TO_PAY"}).StatusCode
T "DELV" 200 (U "/api/orders/$O3" @{status="DELIVERED"}).StatusCode

# Expenses
Write-Host "`n-- Expenses --" -ForegroundColor Yellow
T "EXP1" 201 (P "/api/expenses" @{title="Vegetables";amount=450;category="Supplies";addedBy="admin";shiftId=$S1}).StatusCode
T "EXP2" 201 (P "/api/expenses" @{title="Electricity";amount=1200;category="Bills";addedBy="admin";shiftId=$S1}).StatusCode

# Close S1
Write-Host "`n-- Close S1 --" -ForegroundColor Yellow
$r = U "/api/shifts/$S1" @{status="CLOSED";notes="Morning done"}
T "CLOSE S1" 200 $r.StatusCode
$cs1 = try{$r.Content|ConvertFrom-Json}catch{}
T "S1 CLOSED" "CLOSED" $cs1.status;GT "S1 rev" $cs1.totalRevenue
Write-Host ("S1: rev={0} exp={1} net={2}" -f $cs1.totalRevenue,$cs1.totalExpenses,$cs1.netRevenue) -ForegroundColor White
Write-Host "MORNING DONE" -ForegroundColor Green

# ========== SHIFT 2 ==========
Write-Host "`n============================================" -ForegroundColor Magenta
Write-Host "   SHIFT 2: EVENING" -ForegroundColor Magenta
Write-Host "============================================" -ForegroundColor Magenta

$r = P "/api/shifts" @{startedBy="admin";notes="Evening"}
T "POST S2" 201 $r.StatusCode
$s2 = try{$r.Content|ConvertFrom-Json}catch{};$S2=$s2.id;GT "S2 ID" $S2;T "S2 OPEN" "OPEN" $s2.status

# O4: DINE_IN T2
Write-Host "`n-- O4: DINE_IN T2 --" -ForegroundColor Yellow
$sub = $mKitchen4.price*1 + $mBarista.price*2
$r = P "/api/orders" @{type="DINE_IN";tableId=$table2.id;tableNumber=$table2.number;customerName="Nora";customerPhone="010$($ts%10000000)4";isStaff=$true;customerEmail=$email;items=@(MkItem $mKitchen4 1;MkItem $mBarista 2);subtotal=$sub;serviceCharge=0;deliveryFee=0;total=$sub}
T "POST O4" 201 $r.StatusCode
$o4 = try{$r.Content|ConvertFrom-Json}catch{};$O4=$o4.id;GT "O4#" $o4.orderNumber;T "O4 S2" $S2 $o4.shiftId

# O5: Staff TAKEAWAY
Write-Host "`n-- O5: Staff TAKEAWAY --" -ForegroundColor Yellow
$sub = $mKitchen5.price*1 + $mKitchen3.price*1
$r = P "/api/orders" @{type="TAKEAWAY";customerName="Staff";customerPhone="010$($ts%10000000)5";customerEmail=$email;isStaff=$true;items=@(MkItem $mKitchen5 1;MkItem $mKitchen3 1);subtotal=$sub;serviceCharge=0;deliveryFee=0;total=$sub}
T "POST O5" 201 $r.StatusCode
$o5 = try{$r.Content|ConvertFrom-Json}catch{};$O5=$o5.id;GT "O5#" $o5.orderNumber

# Process O4
Write-Host "`n-- Process O4 --" -ForegroundColor Yellow
T "CONF" 200 (U "/api/orders/$O4/status" @{status="CONFIRMED"}).StatusCode
T "PREP" 200 (U "/api/orders/$O4/status" @{status="PREPARING"}).StatusCode
T "READY" 200 (U "/api/orders/$O4/status" @{status="READY"}).StatusCode
T "RTP" 200 (U "/api/orders/$O4/status" @{status="READY_TO_PAY"}).StatusCode
T "DELV" 200 (U "/api/orders/$O4" @{status="DELIVERED"}).StatusCode

# Process O5
Write-Host "`n-- Process O5 --" -ForegroundColor Yellow
T "CONF" 200 (U "/api/orders/$O5/status" @{status="CONFIRMED"}).StatusCode
T "PREP" 200 (U "/api/orders/$O5/status" @{status="PREPARING"}).StatusCode
T "READY" 200 (U "/api/orders/$O5/status" @{status="READY"}).StatusCode
T "RTP" 200 (U "/api/orders/$O5/status" @{status="READY_TO_PAY"}).StatusCode
T "DELV" 200 (U "/api/orders/$O5" @{status="DELIVERED"}).StatusCode

# Expenses
Write-Host "`n-- Expenses --" -ForegroundColor Yellow
T "EXP3" 201 (P "/api/expenses" @{title="Cleaning";amount=200;category="Maintenance";addedBy="admin";shiftId=$S2}).StatusCode

# Close S2
Write-Host "`n-- Close S2 --" -ForegroundColor Yellow
$r = U "/api/shifts/$S2" @{status="CLOSED";notes="Evening done"}
T "CLOSE S2" 200 $r.StatusCode
$cs2 = try{$r.Content|ConvertFrom-Json}catch{}
T "S2 CLOSED" "CLOSED" $cs2.status;GT "S2 rev" $cs2.totalRevenue
Write-Host ("S2: rev={0} exp={1} net={2}" -f $cs2.totalRevenue,$cs2.totalExpenses,$cs2.netRevenue) -ForegroundColor White
Write-Host "EVENING DONE" -ForegroundColor Green

# ========== FINAL ==========
Write-Host "`n============================================" -ForegroundColor Magenta
Write-Host "   FINAL" -ForegroundColor Magenta
Write-Host "============================================" -ForegroundColor Magenta

T "GET shifts" 200 (G "/api/shifts").StatusCode
T "GET orders" 200 (G "/api/orders").StatusCode
T "GET stats" 200 (G "/api/orders/stats").StatusCode
T "GET reports" 200 (G "/api/reports/discounts?from=2026-06-12&to=2026-06-13").StatusCode
T "GET expenses" 200 (G "/api/expenses").StatusCode
T "GET employees" 200 (G "/api/employees").StatusCode
T "GET settings" 200 (G "/api/settings").StatusCode
T "GET meals" 200 (G "/api/meals").StatusCode
T "GET loyalty" 200 (G "/api/settings/loyalty").StatusCode
T "GET categories" 200 (G "/api/categories").StatusCode
T "GET promotions" 200 (G "/api/promotions").StatusCode
T "GET addons" 200 (G "/api/addons").StatusCode
T "GET tables" 200 (G "/api/tables").StatusCode
T "GET staff" 200 (G "/api/staff").StatusCode

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host ("OK: {0}/{1}" -f $script:pass,($script:pass+$script:fail)) -ForegroundColor $(if($script:fail-eq0){"Green"}else{"Red"})
Write-Host "============================================" -ForegroundColor Cyan
if ($script:fail -gt 0) { exit 1 }
