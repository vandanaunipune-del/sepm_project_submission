const fs = require('fs');
const path = require('path');

const contractsDir = path.join(__dirname, '..', 'contracts');
const buildDir = path.join(__dirname, '..', 'build');

const sources = {};
for (const file of fs.readdirSync(contractsDir)) {
  if (file.endsWith('.sol')) {
    sources[`contracts/${file}`] = {
      content: fs.readFileSync(path.join(contractsDir, file), 'utf8'),
    };
  }
}

const input = {
  language: 'Solidity',
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
  },
};

fs.mkdirSync(buildDir, { recursive: true });
fs.writeFileSync(path.join(buildDir, 'input.json'), JSON.stringify(input, null, 2));
console.log(`Wrote build/input.json (${Object.keys(sources).length} source files)`);