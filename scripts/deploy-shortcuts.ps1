# ==============================================================================
# Deploy Desktop Shortcuts for Gym App and Members Portal
# ==============================================================================

$desktopPath = [Environment]::GetFolderPath("Desktop")
$repoRoot = Split-Path -Parent $PSScriptRoot

$gymBat = Join-Path $PSScriptRoot "start-gym-app.bat"
$membersBat = Join-Path $PSScriptRoot "start-members-portal.bat"

$gymIcon = Join-Path $repoRoot "public\favicon.ico"
$membersIcon = Join-Path $repoRoot "projects\members-portal\public\favicon.ico"

$wshShell = New-Object -ComObject WScript.Shell

# 1. Gym App Shortcut
$gymShortcutPath = Join-Path $desktopPath "Epicenter - Gym App.lnk"
$gymShortcut = $wshShell.CreateShortcut($gymShortcutPath)
$gymShortcut.TargetPath = $gymBat
$gymShortcut.WorkingDirectory = $repoRoot
$gymShortcut.Description = "Launch Epicenter Gym App Development Server"
if (Test-Path $gymIcon) {
    $gymShortcut.IconLocation = "$gymIcon,0"
}
$gymShortcut.Save()
Write-Host "[CREATED] $gymShortcutPath" -ForegroundColor Green

# 2. Members Portal Shortcut
$membersShortcutPath = Join-Path $desktopPath "Epicenter - Members Portal.lnk"
$membersShortcut = $wshShell.CreateShortcut($membersShortcutPath)
$membersShortcut.TargetPath = $membersBat
$membersShortcut.WorkingDirectory = $repoRoot
$membersShortcut.Description = "Launch Epicenter Members Portal Development Server"
if (Test-Path $membersIcon) {
    $membersShortcut.IconLocation = "$membersIcon,0"
}
$membersShortcut.Save()
Write-Host "[CREATED] $membersShortcutPath" -ForegroundColor Green

Write-Host "`nDesktop shortcuts deployed successfully!" -ForegroundColor Cyan
