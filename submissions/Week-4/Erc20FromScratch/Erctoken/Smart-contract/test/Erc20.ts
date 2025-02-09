import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import hre from "hardhat";
import { expect } from "chai";
import { ethers } from "ethers";

describe("ERC20 Test", () => {

  async function deployContracts() {
      const [owner, account1, account2] = await hre.ethers.getSigners();
    
      const ERC20 = await hre.ethers.getContractFactory("ERC20");
      const token = await ERC20.deploy("TestToken", "TST", 18, ethers.parseEther("1000000"));
    
      await token.waitForDeployment();
    
      return { token, owner, account1, account2 };
  }

  describe("Deployment", () => {
      it("should set the correct name, symbol, decimals, and total supply", async () => {
          const { token } = await loadFixture(deployContracts);
          
          expect(await token.name()).to.equal("TestToken");
          expect(await token.symbol()).to.equal("TST");
          expect(await token.decimals()).to.equal(18);
          expect(await token.totalSupply()).to.equal(ethers.parseEther("1000000"));
      });

      it("should assign the total supply to the owner", async () => {
          const { token, owner } = await loadFixture(deployContracts);
          expect(await token.balanceOf(owner.address)).to.equal(ethers.parseEther("1000000"));
      });
  });

  describe("Transfer", () => {
      it("should transfer tokens between accounts", async () => {
          const { token, owner, account1 } = await loadFixture(deployContracts);
          
          const amount = ethers.parseEther("100");
          await expect(token.connect(owner).transfer(account1.address, amount))
              .to.emit(token, "Transfer")
              .withArgs(owner.address, account1.address, amount);

          expect(await token.balanceOf(account1.address)).to.equal(amount);
          expect(await token.balanceOf(owner.address)).to.equal(ethers.parseEther("999900"));
      });

      it("should revert if insufficient balance", async () => {
          const { token, account1 } = await loadFixture(deployContracts);
          const amount = ethers.parseEther("1000001"); // More than total supply

          await expect(token.connect(account1).transfer(token.target, amount)).to.be.revertedWith("Insufficient balance");
      });

      it("should revert if recipient is zero address", async () => {
          const { token, owner } = await loadFixture(deployContracts);
          const amount = ethers.parseEther("100");

          await expect(token.connect(owner).transfer(ethers.ZeroAddress, amount)).to.be.revertedWith("Invalid recipient address");
      });
  });

  describe("Approve", () => {
      it("should approve tokens to be spent by another address", async () => {
          const { token, owner, account1 } = await loadFixture(deployContracts);
          const amount = ethers.parseEther("100");

          await expect(token.connect(owner).approve(account1.address, amount))
              .to.emit(token, "Approval")
              .withArgs(owner.address, account1.address, amount);

          expect(await token.allowance(owner.address, account1.address)).to.equal(amount);
      });

      it("should revert if spender is zero address", async () => {
          const { token, owner } = await loadFixture(deployContracts);
          const amount = ethers.parseEther("100");

          await expect(token.connect(owner).approve(ethers.ZeroAddress, amount)).to.be.revertedWith("Invalid spender address");
      });
  });

  describe("Transfer From", () => {
      it("should allow transfer from one address to another with approval", async () => {
          const { token, owner, account1, account2 } = await loadFixture(deployContracts);
          const amount = ethers.parseEther("100");

          // Approve transfer
          await token.connect(owner).approve(account1.address, amount);
          
          // Transfer from owner to account2 by account1
          await expect(token.connect(account1).transferFrom(owner.address, account2.address, amount))
              .to.emit(token, "Transfer")
              .withArgs(owner.address, account2.address, amount);

          expect(await token.balanceOf(account2.address)).to.equal(amount);
          expect(await token.balanceOf(owner.address)).to.equal(ethers.parseEther("999900"));
          expect(await token.allowance(owner.address, account1.address)).to.equal(0); // Allowance should be reduced
      });

      it("should revert if insufficient allowance", async () => {
          const { token, owner, account1, account2 } = await loadFixture(deployContracts);
          const amount = ethers.parseEther("100");
          const excessAmount = ethers.parseEther("101");

          await token.connect(owner).approve(account1.address, amount);

          await expect(token.connect(account1).transferFrom(owner.address, account2.address, excessAmount)).to.be.revertedWith("Allowance exceeded");
      });
  });

  describe("Allowance", () => {
      it("should return the correct allowance", async () => {
          const { token, owner, account1 } = await loadFixture(deployContracts);
          const amount = ethers.parseEther("100");

          await token.connect(owner).approve(account1.address, amount);
          expect(await token.allowance(owner.address, account1.address)).to.equal(amount);
      });

      it("should revert if owner or spender is zero address", async () => {
          const { token, owner } = await loadFixture(deployContracts);

          await expect(token.allowance(ethers.ZeroAddress, owner.address)).to.be.revertedWith("Invalid address");
          await expect(token.allowance(owner.address, ethers.ZeroAddress)).to.be.revertedWith("Invalid address");
      });
  });
});