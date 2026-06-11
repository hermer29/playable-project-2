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
    padding: 0 !important;
    border: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  #Cocos2dGameContainer.blast-pillarbox {
    position: fixed !important;
    left: 50% !important;
    top: 50% !important;
    width: min(calc(100vh * 9 / 16), 100vw) !important;
    height: 100vh !important;
    margin: 0 !important;
    overflow: hidden !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    transform: translate(-50%, -50%) !important;
  }

  #Cocos2dGameContainer.blast-fullscreen {
    position: fixed !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    overflow: hidden !important;
    display: block !important;
    transform: none !important;
  }

  #GameCanvas {
    display: block !important;
    position: relative !important;
    left: auto !important;
    top: auto !important;
    margin: 0 !important;
    transform: none !important;
  }

  #splash {
    position: fixed !important;
    left: 50% !important;
    top: 50% !important;
    transform: translate(-50%, -50%) !important;
  }

  body.blast-fullscreen-active #splash {
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    height: 100% !important;
    transform: none !important;
  }
</style>
<script>
  (function () {
    function applyGameCanvasSize() {
      var container = document.getElementById('Cocos2dGameContainer');
      var canvas = document.getElementById('GameCanvas');

      if (!container || !canvas) {
        return;
      }

      var viewportW = window.innerWidth || document.documentElement.clientWidth;
      var viewportH = window.innerHeight || document.documentElement.clientHeight;
      var aspectW = 9;
      var aspectH = 16;
      var designWidth = 1080;
      var designHeight = 1920;
      var isNarrow = viewportW / viewportH < aspectW / aspectH;
      var width;
      var height;
      var resolutionPolicy = cc && cc.ResolutionPolicy
        ? cc.ResolutionPolicy.FIXED_HEIGHT
        : 4;

      if (isNarrow) {
        container.classList.remove('blast-pillarbox');
        container.classList.add('blast-fullscreen');
        document.body.classList.add('blast-fullscreen-active');
        width = viewportW;
        height = viewportH;
        if (cc && cc.ResolutionPolicy) {
          resolutionPolicy = cc.ResolutionPolicy.EXACT_FIT;
        }
      } else {
        container.classList.remove('blast-fullscreen');
        container.classList.add('blast-pillarbox');
        document.body.classList.remove('blast-fullscreen-active');
        var rect = container.getBoundingClientRect();
        width = Math.round(rect.width);
        height = Math.round(rect.height);
      }

      if (width <= 0 || height <= 0) {
        return;
      }

      if (window.cc && cc.view && cc.game && cc.game.canvas) {
        cc.game.frame = container;
        cc.view.resizeWithBrowserSize(false);
        cc.view.setFrameSize(width, height);
        cc.view.setDesignResolutionSize(
          designWidth,
          designHeight,
          resolutionPolicy,
        );
      }
    }

    window.__applyBlastCanvasSize = applyGameCanvasSize;
    window.addEventListener('resize', applyGameCanvasSize);
    window.addEventListener('orientationchange', function () {
      setTimeout(applyGameCanvasSize, 50);
    });
    setInterval(applyGameCanvasSize, 250);
    applyGameCanvasSize();
  })();
</script>
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
  padding: 0 !important;
  border: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

#Cocos2dGameContainer.blast-pillarbox {
  position: fixed !important;
  left: 50% !important;
  top: 50% !important;
  width: min(calc(100vh * 9 / 16), 100vw) !important;
  height: 100vh !important;
  margin: 0 !important;
  overflow: hidden !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transform: translate(-50%, -50%) !important;
}

#Cocos2dGameContainer.blast-fullscreen {
  position: fixed !important;
  left: 0 !important;
  top: 0 !important;
  width: 100% !important;
  height: 100% !important;
  margin: 0 !important;
  overflow: hidden !important;
  display: block !important;
  transform: none !important;
}

#GameCanvas {
  display: block !important;
  position: relative !important;
  left: auto !important;
  top: auto !important;
  margin: 0 !important;
  transform: none !important;
}

#splash {
  position: fixed !important;
  left: 50% !important;
  top: 50% !important;
  transform: translate(-50%, -50%) !important;
}

body.blast-fullscreen-active #splash {
  left: 0 !important;
  top: 0 !important;
  width: 100% !important;
  height: 100% !important;
  transform: none !important;
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

$mainScripts = Get-ChildItem -Path $resolvedBuildDir -File |
    Where-Object { $_.Name -match '^main(\..*)?\.js$' }

foreach ($mainScript in $mainScripts) {
    $scriptContent = Get-Content -Path $mainScript.FullName -Raw
    $patchedScriptContent = $scriptContent.Replace(
        "cc.view.resizeWithBrowserSize(true);",
        "cc.view.resizeWithBrowserSize(false);`r`n        if (window.__applyBlastCanvasSize) {`r`n            window.__applyBlastCanvasSize();`r`n        }"
    )
    $patchedScriptContent = $patchedScriptContent.Replace(
        "cc.director.once(cc.Director.EVENT_AFTER_SCENE_LAUNCH, function () {`r`n            splash.style.display = 'none';`r`n        });",
        "cc.director.once(cc.Director.EVENT_AFTER_SCENE_LAUNCH, function () {`r`n            splash.style.display = 'none';`r`n            if (window.__applyBlastCanvasSize) {`r`n                window.__applyBlastCanvasSize();`r`n            }`r`n        });"
    )

    if ($patchedScriptContent -ne $scriptContent) {
        Set-Content -Path $mainScript.FullName -Value $patchedScriptContent -NoNewline
        Write-Host "Patched $($mainScript.FullName)"
    }
}
