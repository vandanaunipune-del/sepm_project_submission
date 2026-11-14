// scripts/build-input.js
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SOURCES_DIR = path.join(ROOT, "contracts");
const BUILD_DIR = path.join(ROOT, "build");

/** Recursively collect every .sol file under `dir`. */
function collect(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collect(full);
    return entry.name.endsWith(".sol") ? [full] : [];
  });
}

const sources = Object.fromEntries(
  collect(SOURCES_DIR).map((file) => [
    path.relative(ROOT, file).split(path.sep).join("/"),
    { content: fs.readFileSync(file, "utf8") },
  ])
);

const input = {
  language: "Solidity",
  sources,
  settings: {
    remappings: ["@openzeppelin/contracts/=node_modules/@openzeppelin/contracts/"],
    optimizer: { enabled: true, runs: 200 },
    // "paris" avoids PUSH0/MCOPY opcodes so the bytecode deploys on L2s and
    // older EVM chains that haven't adopted Shanghai/Cancun yet.
    evmVersion: "paris",
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object", "metadata"],
      },
    },
  },
};

fs.mkdirSync(BUILD_DIR, { recursive: true });
fs.writeFileSync(path.join(BUILD_DIR, "input.json"), JSON.stringify(input, null, 2));
console.log(`Wrote build/input.json (${Object.keys(sources).length} source files)`);