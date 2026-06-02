$ErrorActionPreference = "Stop"

$paths = @(
  "docs/visual-targets/water-sky/target-reference-v1.png",
  "docs/visual-targets/water-sky/p1-composition-current.png",
  "docs/visual-targets/water-sky/p1-composition-comparison.png"
)

$missing = @()
foreach ($path in $paths) {
  if (!(Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  throw "Missing visual target artifacts: $($missing -join ', ')"
}

$paths | ForEach-Object { Get-Item $_ | Select-Object FullName,Length,LastWriteTime }
