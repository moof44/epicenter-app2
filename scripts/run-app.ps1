# ==============================================================================
# Runner for Gym App & Members Portal
# ==============================================================================
param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("gym-app", "members-portal")]
    [string]$App,

    [int]$DefaultPort = 4200
)

$host.UI.RawUI.WindowTitle = if ($App -eq "gym-app") { "Epicenter - Gym App Runner" } else { "Epicenter - Members Portal Runner" }

Write-Host "==========================================================" -ForegroundColor Cyan
if ($App -eq "gym-app") {
    Write-Host "       STARTING GYM APP (STAFF / ADMIN / KIOSK)           " -ForegroundColor Yellow
} else {
    Write-Host "       STARTING MEMBERS PORTAL APPLICATION                " -ForegroundColor Green
}
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# Determine directory
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

# Find port
$scriptPortFinder = Join-Path $PSScriptRoot "find-available-port.ps1"
$selectedPort = & $scriptPortFinder -StartPort $DefaultPort

if ($selectedPort -ne $DefaultPort) {
    Write-Host "[NOTICE] Port $DefaultPort is currently IN USE." -ForegroundColor Red
    Write-Host "[INFO] Automatically allocated alternative Port: $selectedPort" -ForegroundColor Green
} else {
    Write-Host "[INFO] Using designated Port: $selectedPort" -ForegroundColor Green
}

$url = "http://localhost:$selectedPort"
Write-Host "[INFO] Target Local URL: $url" -ForegroundColor Cyan
Write-Host "[INFO] Starting development server with --open..." -ForegroundColor DarkGray
Write-Host "[TIP] To STOP this application, press Ctrl+C or simply close this window." -ForegroundColor Yellow
Write-Host "----------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

if ($App -eq "gym-app") {
    & npx ng serve --port $selectedPort --open
} else {
    & npx ng serve members-portal --port $selectedPort --open
}

Write-Host ""
Write-Host "Application stopped." -ForegroundColor DarkGray
Read-Host -Prompt "Press Enter to exit..."
