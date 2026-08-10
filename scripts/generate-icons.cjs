// Generates public/logo-192.png and public/logo-512.png from public/logo-source.* (PNG/JPG/JPEG)
// Uses Windows System.Drawing via PowerShell. No native deps.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const PUBLIC = path.resolve(__dirname, "..", "public");
const candidates = ["logo-source.png", "logo-source.jpg", "logo-source.jpeg"];
const SRC = candidates
  .map((n) => path.join(PUBLIC, n))
  .find((p) => fs.existsSync(p));
if (!SRC) throw new Error("No logo-source.{png,jpg,jpeg} found in public/");

const psScript = `
param([string]$Src, [string]$SizesCsv, [string]$OutDir)
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile($Src)
$Sizes = $SizesCsv.Split(',') | ForEach-Object { [int]$_ }
foreach ($size in $Sizes) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($img, 0, 0, $size, $size)
  $out = Join-Path $OutDir ("logo-" + $size + ".png")
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Host ("Wrote " + $out)
  $g.Dispose(); $bmp.Dispose()
}
$img.Dispose()
`;

const psPath = path.join(__dirname, "_icon-gen.ps1");
fs.writeFileSync(psPath, psScript, "utf8");

execFileSync(
  "powershell",
  [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    psPath,
    "-Src",
    SRC,
    "-Sizes",
    "192,512",
    "-OutDir",
    PUBLIC,
  ],
  { stdio: "inherit" },
);

fs.unlinkSync(psPath);
console.log("Done.");
