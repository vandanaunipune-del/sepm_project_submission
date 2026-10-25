const hre = require("hardhat");

async function main() {
  // 1. Define the constructor arguments for YieldVault
  // NOTE: Replace these placeholder values with your actual token address and configuration
  const assetAddress = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // The ERC20 token the vault will use
  const name = "Yield Vault Share";
  const symbol = "yvSHARE";
  const initialOwner = "0xYOUR_WALLET_ADDRESS_HERE"; // The owner of the vault
  const feeRecipient = "0xYOUR_FEE_RECIPIENT_ADDRESS_HERE"; // Receives the performance fee shares
  const performanceFeeBps = 1000; // 10% fee (in basis points)
  const depositCap = hre.ethers.parseUnits("1000000", 18); // 1,000,000 tokens cap

  console.log("Deploying YieldVault...");

  // 2. Get the contract factory
  const YieldVault = await hre.ethers.getContractFactory("YieldVault");

  // 3. Deploy the contract with its constructor arguments
  const yieldVault = await YieldVault.deploy(
    assetAddress,
    name,
    symbol,
    initialOwner,
    feeRecipient,
    performanceFeeBps,
    depositCap
  );

  // 4. Wait for the deployment to be mined
  await yieldVault.waitForDeployment();

  const contractAddress = await yieldVault.getAddress();
  console.log(`YieldVault successfully deployed to: ${contractAddress}`);
  console.log(`View on Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);
}

// Standard Hardhat error handling
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });