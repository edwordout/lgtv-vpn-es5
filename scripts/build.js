var fs = require("fs");
var path = require("path");
var babel = require("@babel/core");

var rootDir = path.resolve(__dirname, "..");
var sourceDir = path.join(rootDir, "com.sk.app.lgtv-vpn");
var buildRoot = path.join(rootDir, "build");
var buildDir = path.join(buildRoot, "com.sk.app.lgtv-vpn");
var appJsDir = path.join(buildDir, "js");
var babelConfig = path.join(rootDir, ".babelrc.json");

function collectJavaScriptFiles(dirPath) {
  var entries = fs.readdirSync(dirPath, { withFileTypes: true });
  var files = [];
  var i;
  var entryPath;

  for (i = 0; i < entries.length; i += 1) {
    entryPath = path.join(dirPath, entries[i].name);
    if (entries[i].isDirectory()) {
      files = files.concat(collectJavaScriptFiles(entryPath));
    } else if (path.extname(entries[i].name) === ".js") {
      files.push(entryPath);
    }
  }

  return files;
}

function transpileFile(filePath) {
  var source = fs.readFileSync(filePath, "utf8");
  var result = babel.transformSync(source, {
    configFile: babelConfig,
    filename: filePath
  });

  fs.writeFileSync(filePath, (result && result.code) ? result.code + "\n" : source);
}

fs.rmSync(buildRoot, { recursive: true, force: true });
fs.mkdirSync(buildRoot, { recursive: true });
fs.cpSync(sourceDir, buildDir, { recursive: true });
collectJavaScriptFiles(appJsDir).forEach(transpileFile);

console.log("Built legacy app files in " + buildDir);
