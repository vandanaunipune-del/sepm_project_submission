import fs from 'fs';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const outputPath = './build/output.json';
  if (!fs.existsSync(outputPath)) {
    throw new Error("build/output.json not found. Compile first.");
  }
  const output = JSON.parse(fs.readFileSync(outputPath, 'utf8'));

  // Case-insensitive lookup: the compiled contract is named "helloworld"
  const wanted = "helloworld";
  let sourceFile, contractName;
  for (const f of Object.keys(output.contracts)) {
    const match = Object.keys(output.contracts[f]).find(n => n.toLowerCase() === wanted);
    if (match) { sourceFile = f; contractName = match; break; }
  }

  if (!sourceFile) {
    const found = Object.entries(output.contracts)
      .map(([f, c]) => `${f}: ${Object.keys(c).join(", ")}`).join("\n");
    throw new Error(`Contract ${wanted} not found. Compiled:\n${found}`);
  }

  const { abi, evm } = output.contracts[sourceFile][contractName];
  const bytecode = evm.bytecode.object;

  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);

  let rawKey = (process.env.SEPOLIA_PRIVATE_KEY || "")
    .trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '');
  if (!rawKey.startsWith("0x")) rawKey = "0x" + rawKey;
  if (rawKey.length !== 66) {
    throw new Error(`Invalid private key length: ${rawKey.length}. Expected 66.`);
  }

  const wallet = new ethers.Wallet(rawKey, provider);
  console.log("Deploying with account:", wallet.address);

  const { chainId } = await provider.getNetwork();
  if (chainId !== 11155111n) throw new Error(`Wrong network: ${chainId}`);

  const balance = await provider.getBalance(wallet.address);
  if (balance === 0n) throw new Error(`Wallet ${wallet.address} has 0 Sepolia ETH.`);

  const ctor = abi.find(x => x.type === "constructor");
  if (ctor && ctor.inputs.length > 0) {
    throw new Error(`${contractName} constructor needs: ${ctor.inputs.map(i => `${i.type} ${i.name}`).join(", ")}`);
  }

  console.log(`Deploying ${contractName}...`);
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log(`${contractName} successfully deployed to: ${address}`);
  console.log(`View on Sepolia Etherscan: https://sepolia.etherscan.io/address/${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});