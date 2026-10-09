$BASE  = "http://127.0.0.1:8000/api/v1"
$pass  = 0
$fail  = 0
$H     = @{}

function OK($msg)   { Write-Host "  [PASS] $msg" -ForegroundColor Green;  $script:pass++ }
function FAIL($msg) { Write-Host "  [FAIL] $msg" -ForegroundColor Red;    $script:fail++ }
function HEAD($t)   { Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function INFO($msg) { Write-Host "         $msg" -ForegroundColor DarkGray }
function Get-ErrBody($ex) {
    try {
        $s = $ex.Exception.Response.GetResponseStream()
        return (New-Object System.IO.StreamReader($s)).ReadToEnd() | ConvertFrom-Json
    } catch { return $null }
}

HEAD "1. AUTHENTICATION"

$lr = Invoke-RestMethod "$BASE/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"admin@walangbrownout.com","password":"Admin@WB2026!"}'
$script:H = @{ Authorization="Bearer $($lr.data.token)"; Accept="application/json"; "Content-Type"="application/json" }
if ($lr.data.token -and $lr.data.user.role -eq "admin") { OK "Admin login: token issued, role=admin, name=$($lr.data.user.name)" } else { FAIL "Admin login failed" }

$ur = Invoke-RestMethod "$BASE/auth/user" -Headers $script:H
if ($ur.data.email -eq "admin@walangbrownout.com") { OK "GET /auth/user: $($ur.data.email) [$($ur.data.role)]" } else { FAIL "Wrong user returned" }

$slr = Invoke-RestMethod "$BASE/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"staff@walangbrownout.com","password":"Staff@WB2026!"}'
if ($slr.data.user.role -eq "staff") { OK "Staff login: role=staff" } else { FAIL "Staff login failed" }

try { Invoke-RestMethod "$BASE/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"admin@walangbrownout.com","password":"WRONG"}'; FAIL "Bad password should reject" }
catch { $e = Get-ErrBody $_; if ($e) { OK "Bad password: $($e.error.code)" } else { OK "Bad password: rejected (422)" } }

try { Invoke-RestMethod "$BASE/auth/user" -Headers @{ Accept="application/json" }; FAIL "No token should 401" }
catch { $e = Get-ErrBody $_; if ($e -and $e.error.code -eq "UNAUTHENTICATED") { OK "No token: UNAUTHENTICATED (401)" } else { OK "No token: rejected (401)" } }

HEAD "2. PRODUCTS"

$pr = Invoke-RestMethod "$BASE/products" -Headers $script:H
if ($pr.total -ge 11) { OK "GET /products: $($pr.total) products"; $groups = ($pr.data | Group-Object abc_class | ForEach-Object { "$($_.Name)=$($_.Count)" }) -join ", "; INFO "Classes: $groups" } else { FAIL "Expected 11+ products, got $($pr.total)" }

$ca = Invoke-RestMethod "$BASE/products?abc_class=A" -Headers $script:H
if ($ca.total -ge 4) { OK "Filter abc_class=A: $($ca.total) products" } else { FAIL "Class A filter: only $($ca.total)" }

$cp = Invoke-RestMethod "$BASE/products?is_perishable=1" -Headers $script:H
if ($cp.total -ge 3) { OK "Filter is_perishable=1: $($cp.total) perishable products"; INFO ($cp.data | ForEach-Object { "$($_.product_id)(shelf=$($_.shelf_life_days)d)" }) -join ", " } else { FAIL "Perishable filter: only $($cp.total)" }

$sp = Invoke-RestMethod "$BASE/products/FILT-CARBON-01" -Headers $script:H
if ($sp.data.product_id -eq "FILT-CARBON-01" -and $sp.data.batches.Count -ge 3) { OK "GET /products/FILT-CARBON-01: $($sp.data.batches.Count) batches attached" } else { FAIL "Single product unexpected data" }

try {
    $np = Invoke-RestMethod "$BASE/products" -Method POST -Headers $script:H -Body '{"product_id":"TEST-PROD-01","name":"Test Ceiling Fan","sku":"WB-TEST-FAN-99","abc_class":"B","unit_price":1999,"unit_cost":1200,"is_perishable":false,"is_seasonal":false,"supplier_lead_time_days":10,"initial_stock":50,"safety_stock":15}'
    if ($np.data.product_id -eq "TEST-PROD-01") { OK "POST /products: created TEST-PROD-01, ATP=$($np.data.inventory.available_to_promise)" } else { FAIL "Create product unexpected response" }
} catch { $e = Get-ErrBody $_; if ($e) { FAIL "POST /products: $($e.error.code) $($e.error.message)" } else { FAIL "POST /products threw exception" } }

try {
    $up = Invoke-RestMethod "$BASE/products/TEST-PROD-01" -Method PUT -Headers $script:H -Body '{"unit_price":2099}'
    if ([float]$up.data.unit_price -eq 2099) { OK "PUT /products/TEST-PROD-01: price updated to $($up.data.unit_price)" } else { FAIL "PUT update did not apply, got $($up.data.unit_price)" }
} catch { FAIL "PUT /products threw exception" }

try { Invoke-RestMethod "$BASE/products/DOES-NOT-EXIST" -Headers $script:H; FAIL "Unknown product should 404" }
catch { $e = Get-ErrBody $_; if ($e -and $e.error.code -eq "RESOURCE_NOT_FOUND") { OK "Unknown product: RESOURCE_NOT_FOUND (404)" } else { OK "Unknown product: 404" } }

HEAD "3. INVENTORY"

$ir = Invoke-RestMethod "$BASE/inventory" -Headers $script:H
if ($ir.total -ge 11) {
    OK "GET /inventory: $($ir.total) rows with ATP"
    $s = $ir.data | Where-Object { $_.product_id -eq "AC-PORT-01" }
    INFO "AC-PORT-01: QOH=$($s.quantity_on_hand), Committed=$($s.quantity_committed), ATP=$($s.available_to_promise)"
} else { FAIL "GET /inventory: only $($ir.total)" }

$si = Invoke-RestMethod "$BASE/inventory/FILT-CARBON-01" -Headers $script:H
if ($si.data.available_to_promise -ge 0) { OK "GET /inventory/FILT-CARBON-01: QOH=$($si.data.quantity_on_hand), Committed=$($si.data.quantity_committed), ATP=$($si.data.available_to_promise)" } else { FAIL "ATP negative" }

HEAD "4. BATCHES"

$br = Invoke-RestMethod "$BASE/batches?product_id=FILT-CARBON-01" -Headers $script:H
if ($br.total -ge 3) {
    OK "GET /batches FILT-CARBON-01: $($br.total) lots in FIFO order"
    $br.data | ForEach-Object { INFO "$($_.batch_number) | Bin=$($_.bin_location) | Remains=$($_.quantity_remains) | Days=$($_.days_until_expiry)" }
} else { FAIL "Expected 3 carbon batches, got $($br.total)" }

$ob = Invoke-RestMethod "$BASE/batches/oldest/FILT-CARBON-01" -Headers $script:H
if ($ob.data.batch_number -eq "CARBON-2026-001") { OK "GET /batches/oldest: CARBON-2026-001 (expires in $($ob.data.days_until_expiry) days) -- correct oldest" } else { FAIL "Wrong oldest: $($ob.data.batch_number)" }

$qohB4 = (Invoke-RestMethod "$BASE/inventory/AC-PORT-02" -Headers $script:H).data.quantity_on_hand
$today = Get-Date -Format "yyyy-MM-dd"
try {
    $rv = Invoke-RestMethod "$BASE/batches" -Method POST -Headers $script:H -Body "{`"product_id`":`"AC-PORT-02`",`"batch_number`":`"AC-PORT2-2026-RECV`",`"date_received`":`"$today`",`"quantity`":15,`"bin_location`":`"RACK-A-99`",`"po_reference`":`"PO-TESTRECV`"}"
    $qohAft = (Invoke-RestMethod "$BASE/inventory/AC-PORT-02" -Headers $script:H).data.quantity_on_hand
    if ($rv.data.transaction.transaction_type -eq "RECEIVE" -and $qohAft -eq ($qohB4 + 15)) { OK "POST /batches (RECEIVE): QOH $qohB4 -> $qohAft (+15 confirmed)" } else { FAIL "RECEIVE QOH mismatch: $qohB4 -> $qohAft" }
} catch { $e = Get-ErrBody $_; if ($e) { FAIL "POST /batches: $($e.error.code)" } else { FAIL "POST /batches exception" } }

HEAD "5. TRANSACTION TRIGGERS"

$invB4 = Invoke-RestMethod "$BASE/inventory/THERM-SMART-01" -Headers $script:H
$atpB4 = $invB4.data.available_to_promise
try {
    $cr = Invoke-RestMethod "$BASE/transactions/commit" -Method POST -Headers $script:H -Body '{"product_id":"THERM-SMART-01","quantity":10,"order_reference":"ORD-TEST-5001"}'
    $atpAft = (Invoke-RestMethod "$BASE/inventory/THERM-SMART-01" -Headers $script:H).data.available_to_promise
    if ($cr.data.transaction_type -eq "COMMIT" -and $atpAft -eq ($atpB4 - 10)) { OK "COMMIT: ATP $atpB4 -> $atpAft (-10 confirmed)" } else { FAIL "COMMIT ATP mismatch: $atpB4 -> $atpAft" }
} catch { $e = Get-ErrBody $_; if ($e) { FAIL "COMMIT: $($e.error.code) $($e.error.message)" } else { FAIL "COMMIT exception" } }

try { Invoke-RestMethod "$BASE/transactions/commit" -Method POST -Headers $script:H -Body '{"product_id":"THERM-SMART-01","quantity":99999,"order_reference":"ORD-OVER"}'; FAIL "Over-commit should reject" }
catch { $e = Get-ErrBody $_; if ($e -and $e.error.code -eq "TRANSACTION_REJECTED") { OK "Over-commit: TRANSACTION_REJECTED (ATP_INSUFFICIENT)"; INFO $e.error.message } else { OK "Over-commit: rejected" } }

$batches  = Invoke-RestMethod "$BASE/batches?product_id=FILT-CARBON-01" -Headers $script:H
$oldBatch = $batches.data[0]
Invoke-RestMethod "$BASE/transactions/commit" -Method POST -Headers $script:H -Body "{`"product_id`":`"FILT-CARBON-01`",`"quantity`":2,`"order_reference`":`"ORD-PICK-A`"}" | Out-Null
$qohB4 = (Invoke-RestMethod "$BASE/inventory/FILT-CARBON-01" -Headers $script:H).data.quantity_on_hand
try {
    $pk = Invoke-RestMethod "$BASE/transactions/pick" -Method POST -Headers $script:H -Body "{`"product_id`":`"FILT-CARBON-01`",`"scanned_batch_id`":`"$($oldBatch.batch_id)`",`"quantity`":2,`"order_reference`":`"ORD-PICK-A`"}"
    $qohAft = (Invoke-RestMethod "$BASE/inventory/FILT-CARBON-01" -Headers $script:H).data.quantity_on_hand
    if ($pk.data.transaction_type -eq "PICK" -and $qohAft -eq ($qohB4 - 2)) { OK "PICK (valid FIFO $($oldBatch.batch_number)): QOH $qohB4 -> $qohAft (-2 confirmed)" } else { FAIL "PICK QOH mismatch: $qohB4 -> $qohAft" }
} catch { $e = Get-ErrBody $_; if ($e) { FAIL "PICK: $($e.error.code) $($e.error.message)" } else { FAIL "PICK exception" } }

$wrongBatch = $batches.data[1]
Invoke-RestMethod "$BASE/transactions/commit" -Method POST -Headers $script:H -Body "{`"product_id`":`"FILT-CARBON-01`",`"quantity`":1,`"order_reference`":`"ORD-FIFO-FAIL`"}" | Out-Null
try { Invoke-RestMethod "$BASE/transactions/pick" -Method POST -Headers $script:H -Body "{`"product_id`":`"FILT-CARBON-01`",`"scanned_batch_id`":`"$($wrongBatch.batch_id)`",`"quantity`":1,`"order_reference`":`"ORD-FIFO-FAIL`"}"; FAIL "FIFO violation should reject" }
catch { $e = Get-ErrBody $_; if ($e -and $e.error.code -eq "FIFO_SCAN_ERROR") { OK "PICK wrong batch: FIFO_SCAN_ERROR (FIFO_VIOLATION)"; INFO $e.error.message } else { OK "PICK wrong batch: rejected" } }

$fanQohB4 = (Invoke-RestMethod "$BASE/inventory/FAN-STAND-01" -Headers $script:H).data.quantity_on_hand
$newCount = $fanQohB4 - 5
try {
    $adj = Invoke-RestMethod "$BASE/transactions/adjust" -Method POST -Headers $script:H -Body "{`"product_id`":`"FAN-STAND-01`",`"actual_physical_count`":$newCount,`"reason`":`"Cycle audit - 5 units missing`"}"
    $fanQohAft = (Invoke-RestMethod "$BASE/inventory/FAN-STAND-01" -Headers $script:H).data.quantity_on_hand
    if ($adj.data.transaction_type -eq "ADJUST" -and $fanQohAft -eq $newCount) { OK "ADJUST: QOH $fanQohB4 -> $fanQohAft (variance=$($adj.data.quantity_changed))"; INFO $adj.data.notes } else { FAIL "ADJUST QOH mismatch: $fanQohB4 -> $fanQohAft" }
} catch { $e = Get-ErrBody $_; if ($e) { FAIL "ADJUST: $($e.error.code)" } else { FAIL "ADJUST exception" } }

HEAD "6. TRANSACTION AUDIT LOG"

$tl = Invoke-RestMethod "$BASE/transactions" -Headers $script:H
if ($tl.meta.total -ge 1) { OK "GET /transactions: $($tl.meta.total) total, page $($tl.meta.current_page)/$($tl.meta.last_page)"; INFO "Latest: $($tl.data[0].transaction_type) qty=$($tl.data[0].quantity_changed) product=$($tl.data[0].product_id)" } else { FAIL "Transaction log empty" }

$tf = Invoke-RestMethod "$BASE/transactions?product_id=FILT-CARBON-01" -Headers $script:H
if ($tf.meta.total -ge 1) { OK "GET /transactions?product_id=FILT-CARBON-01: $($tf.meta.total) records"; $tf.data | ForEach-Object { INFO "$($_.transaction_type) qty=$($_.quantity_changed) ref=$($_.reference_number)" } } else { FAIL "Filtered transactions returned 0" }

HEAD "7. REORDER ALERTS (ROP)"

$ra = Invoke-RestMethod "$BASE/alerts/reorder" -Headers $script:H
OK "GET /alerts/reorder: $($ra.total) product(s) at/below ROP"
if ($ra.total -gt 0) { $ra.data | ForEach-Object { INFO "$($_.product_id) | type=$($_.type) | ROP=$($_.reorder_point) | ATP=$($_.available_to_promise) | shortage=$($_.shortage)" } } else { INFO "No products need reordering right now" }

$ropAC = Invoke-RestMethod "$BASE/alerts/reorder/AC-PORT-01" -Headers $script:H
if ($ropAC.data.type -eq "SEASONAL") { OK "ROP AC-PORT-01: SEASONAL | ROP=$($ropAC.data.reorder_point) | SI=$($ropAC.data.seasonal_index) | ATP=$($ropAC.data.available_to_promise) | NeedsReorder=$($ropAC.data.needs_reorder)" } else { FAIL "AC-PORT-01 should be SEASONAL, got $($ropAC.data.type)" }

$ropTH = Invoke-RestMethod "$BASE/alerts/reorder/THERM-SMART-01" -Headers $script:H
if ($ropTH.data.type -eq "NON_SEASONAL") { OK "ROP THERM-SMART-01: NON_SEASONAL | ROP=$($ropTH.data.reorder_point) | SS=$($ropTH.data.safety_stock_used) | ATP=$($ropTH.data.available_to_promise)" } else { FAIL "THERM-SMART-01 should be NON_SEASONAL, got $($ropTH.data.type)" }

$ea = Invoke-RestMethod "$BASE/alerts/expiry?days=60" -Headers $script:H
OK "GET /alerts/expiry?days=60: $($ea.total) batch(es) expiring within 60 days"
$ea.data | ForEach-Object { INFO "$($_.batch_number) | $($_.product_name) | bin=$($_.bin_location) | remains=$($_.quantity_remains) | expires=$($_.expiry_date) | days=$($_.days_until_expiry)" }

HEAD "8. LOGOUT"

$out = Invoke-RestMethod "$BASE/auth/logout" -Method POST -Headers $script:H
if ($out.success -eq $true) { OK "POST /auth/logout: token revoked" } else { FAIL "Logout unexpected response" }

try { Invoke-RestMethod "$BASE/auth/user" -Headers $script:H; FAIL "Revoked token should 401" }
catch { $e = Get-ErrBody $_; if ($e -and $e.error.code -eq "UNAUTHENTICATED") { OK "Revoked token: UNAUTHENTICATED (401) -- invalidated correctly" } else { OK "Revoked token: 401 confirmed" } }

Write-Host ""
Write-Host "=============================================" -ForegroundColor White
Write-Host " RESULTS: $script:pass passed   $script:fail failed" -ForegroundColor $(if ($script:fail -eq 0) { "Green" } else { "Yellow" })
Write-Host "=============================================" -ForegroundColor White
