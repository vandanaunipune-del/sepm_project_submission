const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const contractsDir = path.join(root, "contracts");
const outputDir = path.join(root, "build");
const sources = {};

function collectSolidityFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      collectSolidityFiles(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".sol")) {
      const relativePath = path
        .relative(root, fullPath)
        .split(path.sep)
        .join("/");

      sources[relativePath] = {
        content: fs.readFileSync(fullPath, "utf8")
      };
    }
  }
}

collectSolidityFiles(contractsDir);

if (Object.keys(sources).length === 0) {
  throw new Error("No Solidity files found in contracts/");
}

fs.mkdirSync(outputDir, { recursive: true });

const input = {
  language: "Solidity",
  sources,
  settings: {
    optimizer: {
      enabled: false,
      runs: 200
    },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object"]
      }
    }
  }
};

fs.writeFileSync(
  path.join(outputDir, "input.json"),
  JSON.stringify(input, null, 2)
);

console.log(`Wrote build/input.json (${Object.keys(sources).length} source files)`);
