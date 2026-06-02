param(
  [string]$Target = "docs/visual-targets/water-sky/target-reference-v1.png",
  [string]$Current = "docs/visual-targets/water-sky/p1-composition-current.png",
  [string]$Out = "docs/visual-targets/water-sky/p1-composition-comparison.png"
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $Target)) { throw "Missing target image: $Target" }
if (!(Test-Path $Current)) { throw "Missing current screenshot: $Current" }

Add-Type -AssemblyName System.Drawing

$targetImage = [System.Drawing.Image]::FromFile((Resolve-Path $Target))
$currentImage = [System.Drawing.Image]::FromFile((Resolve-Path $Current))
$tileW = 840
$tileH = 472
$labelH = 44
$canvas = New-Object System.Drawing.Bitmap ($tileW * 2), ($tileH + $labelH)
$graphics = [System.Drawing.Graphics]::FromImage($canvas)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graphics.Clear([System.Drawing.Color]::FromArgb(8, 18, 18))

$font = New-Object System.Drawing.Font("Arial", 18, [System.Drawing.FontStyle]::Bold)
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230, 245, 238))
$graphics.DrawString("TARGET REFERENCE", $font, $brush, 18, 10)
$graphics.DrawString("P1 COMPOSITION", $font, $brush, $tileW + 18, 10)
$graphics.DrawImage($targetImage, 0, $labelH, $tileW, $tileH)
$graphics.DrawImage($currentImage, $tileW, $labelH, $tileW, $tileH)
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(90, 255, 255, 255), 2)
$graphics.DrawLine($pen, $tileW, 0, $tileW, $tileH + $labelH)

New-Item -ItemType Directory -Force -Path (Split-Path $Out) | Out-Null
$canvas.Save((Join-Path (Get-Location) $Out), [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$targetImage.Dispose()
$currentImage.Dispose()
$canvas.Dispose()

Get-Item $Out | Format-List FullName,Length,LastWriteTime
