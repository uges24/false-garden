param(
  [string]$Url = "https://127.0.0.1:5173/water-target-match",
  [string]$Out = "docs/visual-targets/water-sky/p1-composition-current.png",
  [string]$Chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $Chrome)) {
  throw "Chrome not found at $Chrome"
}

New-Item -ItemType Directory -Force -Path (Split-Path $Out) | Out-Null
$resolvedOut = Join-Path (Get-Location) $Out
if (Test-Path $resolvedOut) {
  Remove-Item -LiteralPath $resolvedOut -Force
}

& $Chrome --headless=new --ignore-certificate-errors --window-size=1680,945 "--screenshot=$resolvedOut" $Url | Out-Null

if (!(Test-Path $resolvedOut)) {
  throw "Screenshot was not created at $Out"
}

Get-Item $resolvedOut | Format-List FullName,Length,LastWriteTime
