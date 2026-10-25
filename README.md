# Vault App – YieldVault on Sepolia

SEPM project submission. It contains an ERC-4626 yield vault contract (`YieldVault`) that is compiled with a Dockerized `solc` and deployed to the **Sepolia** public testnet by a GitHub Actions workflow.

- Submission (group) repo: <https://github.com/vandanaunipune-del/sepm_project_submission> (branch `feature_0000_vault_app`)
- Individual repo: <https://github.com/vandanaunipune-del/sepm_submission_individual> (branch `main`)
- Pipeline run and other links: [submission_links.txt](submission_links.txt)

## Contracts

| Contract | Description |
| --- | --- |
| [contracts/YieldVault.sol](contracts/YieldVault.sol) | ERC-4626 tokenized vault (OpenZeppelin 5.1.0) with an owner-only `harvest`, a performance fee (capped at 20%), a fee recipient and an optional deposit cap. Not audited. |
| [contracts/HelloWorld.sol](contracts/HelloWorld.sol) | Minimal contract with a public `greet` string. |

`YieldVault` constructor arguments, as set in [scripts/deploy.js](scripts/deploy.js):

| Argument | Value |
| --- | --- |
| `asset_` | Sepolia USDC `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |
| `name_` / `symbol_` | `Yield Vault Share` / `yvSHARE` |
| `initialOwner_`, `feeRecipient_` | Deployer address |
| `performanceFeeBps_` | `1000` (10%) |
| `depositCap_` | `1,000,000 × 10^18` |

## Project layout

```text
.github/workflows/
  compile.yml          Compiles contracts on push/PR to main
  deploy.yml           Compiles and deploys YieldVault to Sepolia (manual trigger)
contracts/             Solidity sources
scripts/
  build-input.cjs      Builds the solc standard-JSON input (build/input.json)
  deploy.js            Deploys YieldVault with ethers.js using build/output.json
  send-op-tx.ts        Hardhat sample: sends a tx on a simulated OP chain
ignition/modules/      Hardhat Ignition sample module
docker-compose.yml     solc 0.8.24 container used by `npm run compile`
hardhat.config.ts      Hardhat 3 config (solc 0.8.24, sepolia network)
screenshot_*.png       Screenshots of the local and GitHub Actions deployments
```

## Prerequisites

- Node.js 22 (the deploy workflow uses Node 22 for Hardhat 3)
- Docker (for compilation)
- A MetaMask wallet on the Sepolia testnet with some Sepolia ETH
- A Sepolia RPC URL from the MetaMask Developer dashboard

## Setup

### 1. Hardhat project initialisation

This repo was created from a Hardhat project. To set one up from scratch:

```shell
npm install dotenv
npm install --save-dev hardhat
npx hardhat init      # choose the Hardhat 3 "mocha + ethers" sample project
```

Then remove the sample Counter files (`contracts/Counter.sol`, `contracts/Counter.t.sol`, `test/Counter.sol`), update `package.json` and `.gitignore` to the versions in this repo, and rename `scripts/build-input.js` to `scripts/build-input.cjs` (the project is `"type": "module"`).

For an existing clone, just install dependencies:

```shell
npm install
```

### 2. Connect MetaMask to Sepolia

In MetaMask, open **Networks**, enable **Show test networks**, and select **Sepolia**.

### 3. Get a Sepolia RPC URL

1. Sign in at <https://developer.metamask.io/> (organisation: `DES <roll number>`, Industry → Other → Education).
2. Create a new project (Environment: Sapphire Devnet, Chain namespace: EVM).
3. Under **Chains & Networks → Testnet Networks**, enable **Sepolia** and copy its RPC URL. It looks like:
   `https://api.web3auth.io/infura-service/v1/0x<your_key>`

### 4. Get your wallet private key

MetaMask → select account → **Account details** → **Private key** → enter password → hold to reveal → copy.

> Never commit your private key or share it. Keep it only in `.env` (git-ignored) and in GitHub secrets.

### 5. Fund the wallet

Request Sepolia ETH from the faucet: <https://cloud.google.com/application/web3/faucet/ethereum/sepolia>

### 6. Local environment variables

Create a `.env` file in the project root (already listed in `.gitignore`):

```dotenv
SEPOLIA_RPC_URL=https://api.web3auth.io/infura-service/v1/0x<your_key>
SEPOLIA_PRIVATE_KEY=<your_private_key>
```

`deploy.js` accepts the key with or without the `0x` prefix.

## Compile and deploy locally

```shell
npm run compile   # writes build/input.json, then runs solc 0.8.24 in Docker -> build/output.json
npm run deploy    # deploys YieldVault to Sepolia using .env
```

The deploy script prints the deployer address, the contract address and a Sepolia Etherscan link:

```text
Deploying contracts with the account: 0x...
Deploying YieldVault...
YieldVault successfully deployed to: 0x...
View on Sepolia Etherscan: https://sepolia.etherscan.io/address/0x...
```

Compilation uses `evmVersion: "paris"` and the optimizer (200 runs). `@openzeppelin/contracts/` is remapped to `node_modules`.

## GitHub Actions

### Secrets

In the repository go to **Settings → Secrets and variables → Actions** and add:

| Secret | Value |
| --- | --- |
| `SEPOLIA_RPC_URL` | Your MetaMask Developer Sepolia RPC URL |
| `SEPOLIA_PRIVATE_KEY` | Private key of the deploying wallet |

The secret names must match the ones used in [deploy.yml](.github/workflows/deploy.yml).

### Workflows

- **Compile Contracts** ([compile.yml](.github/workflows/compile.yml)) – runs on push and pull request to `main` and on manual dispatch. It builds the solc input, compiles in the `ethereum/solc:0.8.24` container, fails on any compiler error, prints bytecode sizes and uploads `build/output.json` as an artifact.
- **Compile and Deploy to Sepolia** ([deploy.yml](.github/workflows/deploy.yml)) – manual trigger (**Actions → Compile and Deploy to Sepolia → Run workflow**). It compiles the same way, then runs `node scripts/deploy.js` with the secrets above.

### Pushing to both repositories

The `origin` remote is the submission repo and `myremote` is the individual repo:

```shell
git add .
git commit -m "<message>"
git push origin feature_0000_vault_app
git push myremote feature_0000_vault_app:main
```

Check that both workflows succeed in the individual repo's **Actions** tab. Screenshots of the deployment are in [screenshot_github_run.png](screenshot_github_run.png) and [screenshot_local_run.png](screenshot_local_run.png).

## Hardhat

The Hardhat 3 config ([hardhat.config.ts](hardhat.config.ts)) defines a `sepolia` network that reads `SEPOLIA_RPC_URL` and `SEPOLIA_PRIVATE_KEY` as configuration variables (set them as environment variables or with `npx hardhat keystore set <NAME>`). The CI pipeline does not use Hardhat; it compiles with Docker `solc` and deploys with plain ethers.js.

Note: [ignition/modules/Counter.ts](ignition/modules/Counter.ts) and [scripts/send-op-tx.ts](scripts/send-op-tx.ts) are left over from the Hardhat sample project. The Counter contract has been removed, so the Ignition module no longer deploys.
