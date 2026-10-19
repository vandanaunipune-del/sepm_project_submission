const fs = require('fs');
const path = require('path');

const contractsDir = path.join(__dirname, '..', 'contracts');
const buildDir = path.join(__dirname, '..', 'build');

if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
}

const sources = {};
const files = fs.readdirSync(contractsDir);

files.forEach(file => {
    if (file.endsWith('.sol')) {
        const filePath = path.join(contractsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        sources[`contracts/${file}`] = { content };
    }
});

const input = {
    language: 'Solidity',
    sources: sources,
    settings: {
        optimizer: {
            enabled: true,
            runs: 200
        },
        outputSelection: {
            '*': {
                '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode']
            }
        }
    }
};

fs.writeFileSync(path.join(buildDir, 'input.json'), JSON.stringify(input, null, 2));
console.log(`Wrote build/input.json (${Object.keys(sources).length} source files)`);