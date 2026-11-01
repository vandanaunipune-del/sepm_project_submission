import { expect } from "chai";

describe("SimpleVault ABI", function () {
  it("exposes the expected functions without deploying the contract", async function () {
    const { artifacts } = await import("hardhat");
    const artifact = await artifacts.readArtifact("SimpleVault");
    const functions = artifact.abi.filter((entry) => entry.type === "function");

    expect(functions.map((entry) => entry.name)).to.include.members([
      "balances",
      "deposit",
      "withdraw",
    ]);

    const deposit = functions.find((entry) => entry.name === "deposit");
    const withdraw = functions.find((entry) => entry.name === "withdraw");

    expect(deposit?.stateMutability).to.equal("payable");
    expect(withdraw?.stateMutability).to.equal("nonpayable");
  });
});
