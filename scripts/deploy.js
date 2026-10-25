import hre from "hardhat";

async function main() {
  // In Hardhat 3, we connect to the network explicitly
  const connection = await hre.network.connect();
  const { ethers } = connection;

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Constructor arguments for YieldVault
  const assetAddress = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // USD Coin (USDC) on Sepolia
  const name = "Yield Vault Share";
  const symbol = "yvSHARE";
  const initialOwner = deployer.address;
  const feeRecipient = deployer.address;
  const performanceFeeBps = 1000; // 10%
  const depositCap = ethers.parseUnits("1000000", 18);

  const YieldVault = await ethers.getContractFactory("YieldVault");
  const vault = await YieldVault.deploy(
    assetAddress,
    name,
    symbol,
    initialOwner,
    feeRecipient,
    performanceFeeBps,
    depositCap
  );

  await vault.waitForDeployment();
  const contractAddress = await vault.getAddress();
  
  console.log(`YieldVault deployed to: ${contractAddress}`);
  console.log(`View on Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});