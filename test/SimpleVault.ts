import { expect } from "chai";

describe("SimpleVault", function () {
  it("credits deposits and lets the depositor withdraw them", async function () {
    const { network } = await import("hardhat");
    const { ethers } = await network.create();
    const [depositor] = await ethers.getSigners();
    const vault = await ethers.deployContract("SimpleVault");
    const amount = ethers.parseEther("1");

    await vault.deposit(amount, { value: amount });
    expect(await vault.balances(depositor.address)).to.equal(amount);

    await vault.withdraw(amount);
    expect(await vault.balances(depositor.address)).to.equal(0n);
    expect(await ethers.provider.getBalance(await vault.getAddress())).to.equal(0n);
  });

  it("rejects deposits when the declared amount differs from the ETH sent", async function () {
    const { network } = await import("hardhat");
    const { ethers } = await network.create();
    const vault = await ethers.deployContract("SimpleVault");
    const amount = ethers.parseEther("1");

    await expect(vault.deposit(amount, { value: amount - 1n }))
      .to.be.revertedWithCustomError(vault, "IncorrectDepositAmount")
      .withArgs(amount, amount - 1n);
  });

  it("does not allow withdrawing more than the caller deposited", async function () {
    const { network } = await import("hardhat");
    const { ethers } = await network.create();
    const [depositor] = await ethers.getSigners();
    const vault = await ethers.deployContract("SimpleVault");
    const amount = ethers.parseEther("1");

    await expect(vault.withdraw(amount))
      .to.be.revertedWithCustomError(vault, "InsufficientBalance")
      .withArgs(depositor.address, amount, 0n);
  });
});
