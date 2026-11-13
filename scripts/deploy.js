import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JsonRpcProvider, Wallet, ContractFactory } from "ethers";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.SEPOLIA_PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    throw new Error("Missing SEPOLIA_RPC_URL or SEPOLIA_PRIVATE_KEY environment variable.");
  }

  const provider = new JsonRpcProvider(rpcUrl);
  const wallet = new Wallet(privateKey, provider);

  const network = await provider.getNetwork();

  if (network.chainId !== 11155111n) {
    throw new Error(`Wrong network. Expected Sepolia (11155111), got ${network.chainId}.`);
  }

  console.log("Connected to Ethereum Sepolia");
  console.log("Deployer:", wallet.address);
  console.log("Balance:", (await provider.getBalance(wallet.address)).toString(), "wei");

  const outputPath = path.join(ROOT, "build", "output.json");
  const output = JSON.parse(fs.readFileSync(outputPath, "utf8"));

  function getArtifact(source, name) {
    const artifact = output.contracts?.[source]?.[name];

    if (!artifact?.abi || !artifact?.evm?.bytecode?.object) {
      throw new Error(`Missing compiled artifact: ${source}:${name}`);
    }

    return artifact;
  }

  const assetArtifact = getArtifact("contracts/MockAsset.sol", "MockAsset");
  const vaultArtifact = getArtifact("contracts/YieldVault.sol", "YieldVault");

  console.log("\nDeploying MockAsset...");

  const assetFactory = new ContractFactory(
    assetArtifact.abi,
    `0x${assetArtifact.evm.bytecode.object}`,
    wallet
  );

  const asset = await assetFactory.deploy();
  await asset.waitForDeployment();

  const assetAddress = await asset.getAddress();
  console.log("MockAsset deployed:", assetAddress);

  console.log("\nDeploying YieldVault...");

  const vaultFactory = new ContractFactory(
    vaultArtifact.abi,
    `0x${vaultArtifact.evm.bytecode.object}`,
    wallet
  );

  const vault = await vaultFactory.deploy(
    assetAddress,
    "Yield Vault Share",
    "yVTA",
    wallet.address,
    wallet.address,
    500,
    1000000n * 10n ** 18n
  );

  const deploymentTx = vault.deploymentTransaction();
  await vault.waitForDeployment();

  const vaultAddress = await vault.getAddress();
  console.log("YieldVault deployed:", vaultAddress);

  console.log("\nDeployment successful!");
  console.log("Network: Sepolia");
  console.log("Chain ID:", network.chainId.toString());
  console.log("MockAsset:", assetAddress);
  console.log("YieldVault:", vaultAddress);
  console.log("Deployment transaction:", deploymentTx.hash);
  console.log(
    "Explorer:",
    `https://sepolia.etherscan.io/address/${vaultAddress}`
  );
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
