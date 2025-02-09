import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import hre from "hardhat";
import { expect } from "chai";
import { ethers } from "ethers";
import { MyToken, PiggyBank2, PiggyNFT } from "../typechain-types"; 

describe("PiggyBank2 with OpenZeppelin tokens", () => {
  async function deployContracts() {
    const [owner, account1, account2] = await hre.ethers.getSigners();
  
    const MyToken = await hre.ethers.getContractFactory("MyToken");
    const token = await MyToken.deploy(ethers.parseEther("1000000"));
  
    const PiggyNFT = await hre.ethers.getContractFactory("PiggyNFT");
    const nft = await PiggyNFT.deploy();
  
    const PiggyBank2 = await hre.ethers.getContractFactory("PiggyBank2");
    const oneDayFromNow = Math.floor(Date.now() / 1000) + 86400; 
    const piggyBank = await PiggyBank2.deploy(ethers.parseEther("100"), oneDayFromNow, owner.address, token.target, nft.target);
  
    // 
    await nft.transferOwnership(piggyBank.target);
  
    // 
    await token.transfer(account1.address, ethers.parseEther("1000"));
  
    return { piggyBank, token, nft, owner, account1, account2 };
  }

  describe("Deployment", () => {
    it("should set the correct token", async () => {
      const { piggyBank, token } = await loadFixture(deployContracts);
      expect(await piggyBank.token()).to.equal(token.target);
    });

    it("should set the correct manager", async () => {
      const { piggyBank, owner } = await loadFixture(deployContracts);
      expect(await piggyBank.manager()).to.equal(owner.address);
    });
  });

  describe("Save and NFT Minting", () => {
    it("should save tokens and mint NFT after 3rd contribution", async () => {
      const { piggyBank, token, nft, account1 } = await loadFixture(deployContracts);
      
      const saveAmount = ethers.parseEther("10");
      await token.connect(account1).approve(piggyBank.target, ethers.parseEther("100"));
      
      await piggyBank.connect(account1).save(saveAmount); //
      await piggyBank.connect(account1).save(saveAmount); // 

      expect(await nft.balanceOf(account1.address)).to.equal(0);

      await piggyBank.connect(account1).save(saveAmount); // 

      expect(await nft.balanceOf(account1.address)).to.equal(1);
    });
  });

  describe("Withdrawal", () => {
    it("should withdraw tokens if conditions met", async () => {
      const { piggyBank, token, owner, account1 } = await loadFixture(deployContracts);

      const saveAmount = ethers.parseEther("200");
      await token.connect(account1).approve(piggyBank.target, saveAmount);
      await piggyBank.connect(account1).save(saveAmount);

      // 
      await hre.network.provider.send("evm_increaseTime", [86400]);
      await hre.network.provider.send("evm_mine");

      const ownerBalanceBefore = await token.balanceOf(owner.address);
      await piggyBank.withdrawal();
      const ownerBalanceAfter = await token.balanceOf(owner.address);

      expect(ownerBalanceAfter).to.be.greaterThan(ownerBalanceBefore);
    });

    it("should revert if withdrawal before time", async () => {
      const { piggyBank } = await loadFixture(deployContracts);
      await expect(piggyBank.withdrawal()).to.be.revertedWith('NOT YET TIME');
    });

    it("should revert if target amount not reached", async () => {
      const { piggyBank, token, owner, account1 } = await loadFixture(deployContracts);

      const saveAmount = ethers.parseEther("50");
      await token.connect(account1).approve(piggyBank.target, saveAmount);
      await piggyBank.connect(account1).save(saveAmount);

      // 
      await hre.network.provider.send("evm_increaseTime", [86400]);
      await hre.network.provider.send("evm_mine");

      await expect(piggyBank.withdrawal()).to.be.revertedWith('TARGET AMOUNT NOT REACHED');
    });
  });
});