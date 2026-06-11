param(
    [string]$BuildDir = "web/web-mobile"
)

$ErrorActionPreference = "Stop"

$resolvedBuildDir = Resolve-Path -Path $BuildDir -ErrorAction Stop
$indexPath = Join-Path $resolvedBuildDir "index.html"

if (-not (Test-Path $indexPath)) {
    throw "index.html was not found in $resolvedBuildDir"
}

$htmlStartMarker = "<!-- blast-centering:start -->"
$htmlEndMarker = "<!-- blast-centering:end -->"
$cssStartMarker = "/* blast-centering:start */"
$cssEndMarker = "/* blast-centering:end */"

$htmlStyle = @"
$htmlStartMarker
<style>
  html,
  body {
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    overflow: hidden !important;
    background: #000 !important;
  }

  body {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  #Cocos2dGameContainer {
    position: fixed !important;
    left: 0 !important;
    top: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    margin: 0 !important;
    overflow: hidden !important;
    display: block !important;
  }

  #GameCanvas {
    display: block !important;
    position: absolute !important;
    left: 50% !important;
    top: 50% !important;
    margin: 0 !important;
    transform: translate(-50%, -50%) !important;
  }

  #splash {
    position: fixed !important;
    left: 50% !important;
    top: 50% !important;
    transform: translate(-50%, -50%) !important;
  }
</style>
$htmlEndMarker
"@

$cssOverride = @"
$cssStartMarker
html,
body {
  width: 100% !important;
  height: 100% !important;
  margin: 0 !important;
  overflow: hidden !important;
  background: #000 !important;
}

body {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

#Cocos2dGameContainer {
  position: fixed !important;
  left: 0 !important;
  top: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  margin: 0 !important;
  overflow: hidden !important;
  display: block !important;
}

#GameCanvas {
  display: block !important;
  position: absolute !important;
  left: 50% !important;
  top: 50% !important;
  margin: 0 !important;
  transform: translate(-50%, -50%) !important;
}

#splash {
  position: fixed !important;
  left: 50% !important;
  top: 50% !important;
  transform: translate(-50%, -50%) !important;
}
$cssEndMarker
"@

function Remove-MarkedBlock {
    param(
        [string]$Content,
        [string]$StartMarker,
        [string]$EndMarker
    )

    $escapedStartMarker = [regex]::Escape($StartMarker)
    $escapedEndMarker = [regex]::Escape($EndMarker)
    $pattern = "(?s)\r?\n?$escapedStartMarker.*?$escapedEndMarker\r?\n?"
    return [regex]::Replace($Content, $pattern, "`r`n")
}

$indexContent = Get-Content -Path $indexPath -Raw
$indexContent = Remove-MarkedBlock $indexContent $htmlStartMarker $htmlEndMarker

if ($indexContent -notmatch "</head>") {
    throw "index.html does not contain a closing </head> tag."
}

$indexContent = $indexContent -replace "</head>", "$htmlStyle`r`n</head>"
Set-Content -Path $indexPath -Value $indexContent -NoNewline
Write-Host "Patched $indexPath"

$cssFiles = Get-ChildItem -Path $resolvedBuildDir -File |
    Where-Object { $_.Name -like "style-mobile*.css" -or $_.Name -like "style-desktop*.css" }

foreach ($cssFile in $cssFiles) {
    $cssContent = Get-Content -Path $cssFile.FullName -Raw
    $cssContent = Remove-MarkedBlock $cssContent $cssStartMarker $cssEndMarker
    $cssContent = $cssContent.TrimEnd() + "`r`n`r`n" + $cssOverride + "`r`n"
    Set-Content -Path $cssFile.FullName -Value $cssContent -NoNewline
    Write-Host "Patched $($cssFile.FullName)"
}
