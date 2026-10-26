
import fs from "node:fs";
import dotenv from "dotenv";
import { ethers } from "ethers";

dotenv.config();

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  let privateKey = (process.env.SEPOLIA_PRIVATE_KEY || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, "");

  if (!rpcUrl || !privateKey) {
    throw new Error(
      "Missing SEPOLIA_RPC_URL or SEPOLIA_PRIVATE_KEY environment variable."
    );
  }

  if (!privateKey.startsWith("0x")) {
    privateKey = `0x${privateKey}`;
  }

  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new Error("SEPOLIA_PRIVATE_KEY must contain 64 hexadecimal characters, optionally prefixed with 0x.");
  }

  // Read the Solidity compiler output.
  const outputPath = "./build/output.json";

  if (!fs.existsSync(outputPath)) {
    throw new Error("build/output.json not found. Run npm run compile first.");
  }

  const output = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  const contractData =
    output.contracts?.["contracts/HelloWorld.sol"]?.HelloWorld;

  if (!contractData?.evm?.bytecode?.object) {
    throw new Error("HelloWorld contract or deployment bytecode not found.");
  }

  const abi = contractData.abi;
  const bytecode = `0x${contractData.evm.bytecode.object}`;

  // Connect to Sepolia and confirm the chain.
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const network = await provider.getNetwork();

  if (network.chainId !== 11155111n) {
    throw new Error(
      `Wrong network: expected Sepolia (11155111), received ${network.chainId}.`
    );
  }

  const wallet = new ethers.Wallet(privateKey, provider);
  console.log("Deploying HelloWorld with account:", wallet.address);

  // HelloWorld has no constructor arguments.
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy();

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const tx = contract.deploymentTransaction();

  console.log("HelloWorld deployed successfully!");
  console.log("Contract address:", address);
  console.log(`Etherscan: https://sepolia.etherscan.io/address/${address}`);

  if (tx) {
    console.log("Transaction hash:", tx.hash);
    console.log(`Transaction: https://sepolia.etherscan.io/tx/${tx.hash}`);
  }

  console.log("Greeting:", await contract.greet());
}

main().catch((error) => {
  console.error("Deployment failed:", error.message);
  process.exitCode = 1;
});
