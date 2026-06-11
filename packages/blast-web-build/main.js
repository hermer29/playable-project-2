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
${CSS_END_MARKER}`;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function removeMarkedBlock(content, startMarker, endMarker) {
  const pattern = new RegExp(`\\r?\\n?${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}\\r?\\n?`, 'g');
  return content.replace(pattern, '\n');
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

function patchWebBuild(options, callback) {
  try {
    if (!options || options.platform !== 'web-mobile') {
      callback();
      return;
    }

    patchIndexHtml(options.dest);
    patchCssFiles(options.dest);
    callback();
  } catch (error) {
    Editor.error(`[blast-web-build] ${error.stack || error.message || error}`);
    callback(error);
  }
}

module.exports = {
  load() {
    Editor.Builder.on('before-change-files', patchWebBuild);
  },

  unload() {
    Editor.Builder.removeListener('before-change-files', patchWebBuild);
  },
};
