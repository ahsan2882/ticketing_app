const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const packageJson = require(path.join(root, "package.json"));
const readmePath = path.join(root, "README.md");

const readme = fs.readFileSync(readmePath, "utf8");

const updatedReadme = readme.replace(
  /<!-- PACKAGE_VERSION -->.*?<!-- \/PACKAGE_VERSION -->/,
  `<!-- PACKAGE_VERSION -->${packageJson.version}<!-- /PACKAGE_VERSION -->`,
);

if (updatedReadme === readme) {
  throw new Error("README package-version marker was not found");
}

fs.writeFileSync(readmePath, updatedReadme);
console.log(`README version updated to ${packageJson.version}`);
