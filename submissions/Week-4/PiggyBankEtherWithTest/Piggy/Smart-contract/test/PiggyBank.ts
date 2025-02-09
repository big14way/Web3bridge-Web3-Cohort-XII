import {
    loadFixture,
  } from "@nomicfoundation/hardhat-toolbox/network-helpers";
  import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
  import hre from "hardhat";
  import { expect } from "chai";
  import { ethers } from "ethers";
  
  describe("PiggyBank2 test", () => {
  
    async function deployContracts() {
        const [owner, account1, account2] = await hre.ethers.getSigners();
      
        const ERC20 = await hre.ethers.getContractFactory("ERC20");
        const token = await ERC20.deploy("MyToken", "MTK", 18, ethers.parseEther("1000000"));
      
        // Transfer tokens to account1 for testing
        await token.transfer(account1.address, ethers.parseEther("1000"));
      
        const PiggyBank2 = await hre.ethers.getContractFactory("PiggyBank2");
        const oneDayFromNow = Math.floor(Date.now() / 1000) + 86400; // 86400 seconds = 1 day
        const piggyBank = await PiggyBank2.deploy(ethers.parseEther("100"), oneDayFromNow, owner.address, token.target);
      
        return { piggyBank, token, owner, account1, account2 };
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
  
    describe("Save", () => {
      it("should save tokens into the piggy bank", async () => {
        const { piggyBank, token, owner, account1 } = await loadFixture(deployContracts);
        
        // Approve transfer
        await token.connect(account1).approve(piggyBank.target, ethers.parseEther("10"));
        
        // Save tokens
        const saveAmount = ethers.parseEther("10");
        await piggyBank.connect(account1).save(saveAmount);
  
        expect(await piggyBank.contributions(account1.address)).to.equal(saveAmount);
      });
  
      it("should revert if saving after withdrawal date", async () => {
        const { piggyBank, token, owner, account1 } = await loadFixture(deployContracts);
        
        await token.connect(account1).approve(piggyBank.target, ethers.parseEther("10"));
        
        // Move forward in time past withdrawal date
        await hre.network.provider.send("evm_increaseTime", [86401]); // 1 day + 1 second
        await hre.network.provider.send("evm_mine");
  
        await expect(piggyBank.connect(account1).save(ethers.parseEther("10"))).to.be.revertedWith('YOU CAN NO LONGER SAVE');
      });
    });
  
    describe("Withdrawal", () => {
        it("should withdraw tokens if conditions met", async () => {
            const { piggyBank, token, owner, account1 } = await loadFixture(deployContracts);
          
            // Ensure account1 has tokens
            await token.connect(owner).transfer(account1.address, ethers.parseEther("200"));
          
            await token.connect(account1).approve(piggyBank.target, ethers.parseEther("200"));
            await piggyBank.connect(account1).save(ethers.parseEther("200"));
          
            // Move forward in time to withdrawal date
            await hre.network.provider.send("evm_increaseTime", [86400]);
            await hre.network.provider.send("evm_mine");
          
            const ownerBalanceBefore = await token.balanceOf(owner.address);
            await piggyBank.withdrawal();
            const ownerBalanceAfter = await token.balanceOf(owner.address);
          
            expect(ownerBalanceAfter).to.be.greaterThan(ownerBalanceBefore);
          });
          
          it("should revert if target amount not reached", async () => {
            const { piggyBank, token, owner, account1 } = await loadFixture(deployContracts);
          
            // Ensure account1 has tokens
            await token.connect(owner).transfer(account1.address, ethers.parseEther("50"));
          
            await token.connect(account1).approve(piggyBank.target, ethers.parseEther("50"));
            await piggyBank.connect(account1).save(ethers.parseEther("50"));
          
            // Move forward in time to withdrawal date
            await hre.network.provider.send("evm_increaseTime", [86400]);
            await hre.network.provider.send("evm_mine");
          
            await expect(piggyBank.withdrawal()).to.be.revertedWith('TARGET AMOUNT NOT REACHED');
          });
    });
  });