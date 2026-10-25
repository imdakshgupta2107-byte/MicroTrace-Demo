param([switch]$OpenAndroid,[switch]$SkipInstall)
$ErrorActionPreference = "Stop"
# Always anchor commands at the extracted project root, never at the caller's folder.
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath ".\package.json")) { throw "package.json is missing. Extract the complete source ZIP, not only the APK." }
$version = & node --version
if ($LASTEXITCODE -ne 0) { throw "Install Node.js 22.12+ first." }
$parts = $version.TrimStart("v").Split(".")
$major = [int]$parts[0]; $minor = [int]$parts[1]
if (($major -eq 20 -and $minor -lt 19) -or $major -lt 20 -or $major -eq 21 -or ($major -eq 22 -and $minor -lt 12)) { throw "Use Node.js 22.12+ (or 20.19+)." }
if (-not $SkipInstall) { & npm.cmd ci; if ($LASTEXITCODE -ne 0) { throw "Dependency installation failed." } }
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw "Web build failed." }
& npx.cmd cap sync android
if ($LASTEXITCODE -ne 0) { throw "Android sync failed." }
if ($OpenAndroid) { & npx.cmd cap open android; if ($LASTEXITCODE -ne 0) { throw "Could not open Android Studio." } }
Write-Host "MicroTrace Demo build and Android sync complete. It is a local-only offline demo; no cloud, email or hardware enforcement is deployed."
