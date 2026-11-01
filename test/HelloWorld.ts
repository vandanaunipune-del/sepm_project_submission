import { expect } from "chai";

describe("HelloWorld", function () {
  it("returns the initial greeting", async function () {
    const { network } = await import("hardhat");
    const { ethers } = await network.create();
    const helloWorld = await ethers.deployContract("HelloWorld");

    expect(await helloWorld.greet()).to.equal("Hello World!");
  });
});
