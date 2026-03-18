var fs = require("fs");
var path = require("path");

var rootDir = path.resolve(__dirname, "..");
var filesToCheck = [
  path.join(rootDir, "com.sk.app.lgtv-vpn", "js", "index.js"),
  path.join(rootDir, "com.sk.app.lgtv-vpn", "js", "legacy-polyfills.js")
];
var bannedPatterns = [
  { regex: /\bPromise\b/, message: "Avoid Promise in shipped app code; use callbacks for legacy support." },
  { regex: /\basync\b/, message: "Avoid async/await in shipped app code." },
  { regex: /\bawait\b/, message: "Avoid async/await in shipped app code." },
  { regex: /=>/, message: "Avoid arrow functions in shipped app code." },
  { regex: /\bconst\b/, message: "Avoid const in shipped app code." },
  { regex: /\blet\b/, message: "Avoid let in shipped app code." },
  { regex: /\.includes\(/, message: "Avoid String.prototype.includes in shipped app code." },
  { regex: /\bclassList\b/, message: "Avoid classList in shipped app code." },
  { regex: /`/, message: "Avoid template literals in shipped app code." }
];
var failures = [];

filesToCheck.forEach(function (filePath) {
  var source = fs.readFileSync(filePath, "utf8");

  bannedPatterns.forEach(function (rule) {
    if (rule.regex.test(source)) {
      failures.push(path.relative(rootDir, filePath) + ": " + rule.message);
    }
  });
});

if (failures.length) {
  console.error("Compatibility checks failed:");
  failures.forEach(function (failure) {
    console.error("- " + failure);
  });
  process.exit(1);
}

console.log("Compatibility checks passed for " + filesToCheck.length + " app-owned files.");
