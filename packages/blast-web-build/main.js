'use strict';

const fs = require('fs');
const path = require('path');

const HTML_START_MARKER = '<!-- blast-centering:start -->';
const HTML_END_MARKER = '<!-- blast-centering:end -->';
const CSS_START_MARKER = '/* blast-centering:start */';
const CSS_END_MARKER = '/* blast-centering:end */';

const htmlStyle = `${HTML_START_MARKER}
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
${HTML_END_MARKER}`;

const cssOverride = `${CSS_START_MARKER}
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
${CSS_END_MARKER}`;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function removeMarkedBlock(content, startMarker, endMarker) {
  const pattern = new RegExp(`\\r?\\n?${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}\\r?\\n?`, 'g');
  return content.replace(pattern, '\n');
}

function resolveBuildDir(options) {
  const candidates = [];

  if (options && options.dest) {
    candidates.push(options.dest);
    candidates.push(path.join(options.dest, 'web-mobile'));
  }

  if (options && options.buildPath) {
    candidates.push(path.join(options.buildPath, 'web-mobile'));
    candidates.push(options.buildPath);
  }

  const seen = new Set();
  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate)) {
      continue;
    }

    seen.add(candidate);
    if (fs.existsSync(path.join(candidate, 'index.html'))) {
      return candidate;
    }
  }

  throw new Error(`index.html was not found. Checked: ${Array.from(seen).join(', ')}`);
}

function patchIndexHtml(buildDir) {
  const indexPath = path.join(buildDir, 'index.html');

  if (!fs.existsSync(indexPath)) {
    throw new Error(`index.html was not found in ${buildDir}`);
  }

  let content = fs.readFileSync(indexPath, 'utf8');
  content = removeMarkedBlock(content, HTML_START_MARKER, HTML_END_MARKER);

  if (!content.includes('</head>')) {
    throw new Error('index.html does not contain a closing </head> tag.');
  }

  content = content.replace('</head>', `${htmlStyle}\n</head>`);
  fs.writeFileSync(indexPath, content);
  Editor.log(`[blast-web-build] Patched ${indexPath}`);
}

function patchCssFiles(buildDir) {
  const cssFiles = fs.readdirSync(buildDir)
    .filter((fileName) => /^style-(mobile|desktop).*\.css$/.test(fileName));

  cssFiles.forEach((fileName) => {
    const cssPath = path.join(buildDir, fileName);
    let content = fs.readFileSync(cssPath, 'utf8');
    content = removeMarkedBlock(content, CSS_START_MARKER, CSS_END_MARKER);
    content = `${content.replace(/\s+$/, '')}\n\n${cssOverride}\n`;
    fs.writeFileSync(cssPath, content);
    Editor.log(`[blast-web-build] Patched ${cssPath}`);
  });
}

function patchMainScripts(buildDir) {
  const mainScripts = fs.readdirSync(buildDir)
    .filter((fileName) => /^main(\..*)?\.js$/.test(fileName));

  mainScripts.forEach((fileName) => {
    const scriptPath = path.join(buildDir, fileName);
    let content = fs.readFileSync(scriptPath, 'utf8');
    let nextContent = content.replace(
      'cc.view.resizeWithBrowserSize(true);',
      `cc.view.resizeWithBrowserSize(false);
        if (window.__applyBlastCanvasSize) {
            window.__applyBlastCanvasSize();
        }`,
    );
    nextContent = nextContent.replace(
      `cc.director.once(cc.Director.EVENT_AFTER_SCENE_LAUNCH, function () {
            splash.style.display = 'none';
        });`,
      `cc.director.once(cc.Director.EVENT_AFTER_SCENE_LAUNCH, function () {
            splash.style.display = 'none';
            if (window.__applyBlastCanvasSize) {
                window.__applyBlastCanvasSize();
            }
        });`,
    );

    if (nextContent !== content) {
      fs.writeFileSync(scriptPath, nextContent);
      Editor.log(`[blast-web-build] Patched ${scriptPath}`);
    }
  });
}

function patchWebBuild(options, callback) {
  if (!options || options.platform !== 'web-mobile') {
    callback();
    return;
  }

  try {
    const buildDir = resolveBuildDir(options);
    Editor.log(`[blast-web-build] Patching ${buildDir}`);
    patchIndexHtml(buildDir);
    patchCssFiles(buildDir);
    patchMainScripts(buildDir);
    callback();
  } catch (error) {
    Editor.error(`[blast-web-build] ${error.stack || error.message || error}`);
    callback();
  }
}

module.exports = {
  load() {
    Editor.Builder.on('build-finished', patchWebBuild);
  },

  unload() {
    Editor.Builder.removeListener('build-finished', patchWebBuild);
  },
};
