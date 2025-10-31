import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import type { FhevmType } from "@fhevm/hardhat-plugin";

describe("PredictionMarket", function () {
  async function deployPredictionMarketFixture() {
    const [owner, user1, user2, user3] = await ethers.getSigners();
    
    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    const predictionMarket = await PredictionMarket.deploy();
    
    return { predictionMarket, owner, user1, user2, user3 };
  }

  describe("Event Management", function () {
    it("Should create a prediction event", async function () {
      const { predictionMarket, owner } = await deployPredictionMarketFixture();
      
      const now = Math.floor(Date.now() / 1000);
      const startTime = now + 3600; // 1 hour from now
      const endTime = now + 7200;   // 2 hours from now
      const priceYes = ethers.parseEther("0.1");
      const priceNo = ethers.parseEther("0.1");
      
      await expect(
        predictionMarket.createPredictionEvent(
          "Will Bitcoin reach $100K by end of year?",
          startTime,
          endTime,
          priceYes,
          priceNo
        )
      ).to.emit(predictionMarket, "PredictionEventCreated")
       .withArgs(0, "Will Bitcoin reach $100K by end of year?", startTime, endTime, priceYes, priceNo);
      
      const event = await predictionMarket.getPredictionEvent(0);
      expect(event.description).to.equal("Will Bitcoin reach $100K by end of year?");
      expect(event.startTime).to.equal(startTime);
      expect(event.endTime).to.equal(endTime);
      expect(event.priceYes).to.equal(priceYes);
      expect(event.priceNo).to.equal(priceNo);
      expect(event.isResolved).to.be.false;
    });

    it("Should not allow non-owner to create events", async function () {
      const { predictionMarket, user1 } = await deployPredictionMarketFixture();
      
      const now = Math.floor(Date.now() / 1000);
      
      await expect(
        predictionMarket.connect(user1).createPredictionEvent(
          "Test event",
          now + 3600,
          now + 7200,
          ethers.parseEther("0.1"),
          ethers.parseEther("0.1")
        )
      ).to.be.revertedWith("Only owner can call this function");
    });

    it("Should not create event with invalid times", async function () {
      const { predictionMarket } = await deployPredictionMarketFixture();
      
      const now = Math.floor(Date.now() / 1000);
      
      // Start time in the past
      await expect(
        predictionMarket.createPredictionEvent(
          "Test event",
          now - 3600,
          now + 3600,
          ethers.parseEther("0.1"),
          ethers.parseEther("0.1")
        )
      ).to.be.revertedWith("Start time must be in the future");
      
      // End time before start time
      await expect(
        predictionMarket.createPredictionEvent(
          "Test event",
          now + 7200,
          now + 3600,
          ethers.parseEther("0.1"),
          ethers.parseEther("0.1")
        )
      ).to.be.revertedWith("End time must be after start time");
    });
  });

  describe("Betting", function () {
    async function createActiveEvent() {
      const { predictionMarket, owner, user1, user2 } = await deployPredictionMarketFixture();
      
      const now = Math.floor(Date.now() / 1000);
      const startTime = now - 300;  // Started 5 minutes ago
      const endTime = now + 3600;   // Ends in 1 hour
      const priceYes = ethers.parseEther("0.1");
      const priceNo = ethers.parseEther("0.1");
      
      await predictionMarket.createPredictionEvent(
        "Will Bitcoin reach $100K?",
        startTime,
        endTime,
        priceYes,
        priceNo
      );
      
      return { predictionMarket, owner, user1, user2, priceYes, priceNo };
    }

    it("Should allow users to place encrypted bets", async function () {
      const { predictionMarket, user1, priceYes } = await createActiveEvent();
      
      const shares = 5;
      const isYesBet = true;
      const payment = priceYes * BigInt(shares);
      
      // Create encrypted inputs
      const input = fhevm.createEncryptedInput(predictionMarket.target as string, user1.address);
      input.add32(shares);
      input.addBool(isYesBet);
      const encryptedInput = await input.encrypt();
      
      await expect(
        predictionMarket.connect(user1).placeBet(
          0,
          encryptedInput.handles[0],
          encryptedInput.handles[1],
          encryptedInput.inputProof,
          { value: payment }
        )
      ).to.emit(predictionMarket, "BetPlaced")
       .withArgs(0, user1.address, await predictionMarket.provider.getBlockNumber() + 1);
      
      const userBet = await predictionMarket.getUserBet(0, user1.address);
      expect(userBet.hasPlacedBet).to.be.true;
      
      // Check that we can decrypt the bet (user should have permission)
      const decryptedShares = await fhevm.userDecryptEuint(
        "euint32" as FhevmType,
        userBet.encryptedShares,
        predictionMarket.target as string,
        user1
      );
      expect(decryptedShares).to.equal(shares);
      
      const decryptedDirection = await fhevm.userDecryptEbool(
        userBet.isYesBet,
        predictionMarket.target as string,
        user1
      );
      expect(decryptedDirection).to.equal(isYesBet);
    });

    it("Should not allow betting with insufficient payment", async function () {
      const { predictionMarket, user1, priceYes } = await createActiveEvent();
      
      const shares = 5;
      const isYesBet = true;
      const insufficientPayment = priceYes * BigInt(shares) - BigInt(1); // 1 wei short
      
      const input = fhevm.createEncryptedInput(predictionMarket.target as string, user1.address);
      input.add32(shares);
      input.addBool(isYesBet);
      const encryptedInput = await input.encrypt();
      
      const tx = await predictionMarket.connect(user1).placeBet(
        0,
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.inputProof,
        { value: insufficientPayment }
      );
      
      await tx.wait();
      
      // Check error code
      const [errorCode] = await predictionMarket.getLastError(user1.address);
      const decryptedError = await fhevm.userDecryptEuint(
        "euint32" as FhevmType,
        errorCode,
        predictionMarket.target as string,
        user1
      );
      expect(decryptedError).to.equal(2); // INSUFFICIENT_PAYMENT
    });

    it("Should not allow double betting", async function () {
      const { predictionMarket, user1, priceYes } = await createActiveEvent();
      
      const shares = 5;
      const isYesBet = true;
      const payment = priceYes * BigInt(shares);
      
      // First bet
      const input1 = fhevm.createEncryptedInput(predictionMarket.target as string, user1.address);
      input1.add32(shares);
      input1.addBool(isYesBet);
      const encryptedInput1 = await input1.encrypt();
      
      await predictionMarket.connect(user1).placeBet(
        0,
        encryptedInput1.handles[0],
        encryptedInput1.handles[1],
        encryptedInput1.inputProof,
        { value: payment }
      );
      
      // Second bet attempt
      const input2 = fhevm.createEncryptedInput(predictionMarket.target as string, user1.address);
      input2.add32(shares);
      input2.addBool(isYesBet);
      const encryptedInput2 = await input2.encrypt();
      
      const tx = await predictionMarket.connect(user1).placeBet(
        0,
        encryptedInput2.handles[0],
        encryptedInput2.handles[1],
        encryptedInput2.inputProof,
        { value: payment }
      );
      
      await tx.wait();
      
      // Check error code
      const [errorCode] = await predictionMarket.getLastError(user1.address);
      const decryptedError = await fhevm.userDecryptEuint(
        "euint32" as FhevmType,
        errorCode,
        predictionMarket.target as string,
        user1
      );
      expect(decryptedError).to.equal(3); // ALREADY_BET
    });

    it("Should handle mixed YES and NO bets", async function () {
      const { predictionMarket, user1, user2, priceYes, priceNo } = await createActiveEvent();
      
      // User1 bets YES
      const sharesYes = 10;
      const paymentYes = priceYes * BigInt(sharesYes);
      
      const inputYes = fhevm.createEncryptedInput(predictionMarket.target as string, user1.address);
      inputYes.add32(sharesYes);
      inputYes.addBool(true);
      const encryptedInputYes = await inputYes.encrypt();
      
      await predictionMarket.connect(user1).placeBet(
        0,
        encryptedInputYes.handles[0],
        encryptedInputYes.handles[1],
        encryptedInputYes.inputProof,
        { value: paymentYes }
      );
      
      // User2 bets NO
      const sharesNo = 15;
      const paymentNo = priceNo * BigInt(sharesNo);
      
      const inputNo = fhevm.createEncryptedInput(predictionMarket.target as string, user2.address);
      inputNo.add32(sharesNo);
      inputNo.addBool(false);
      const encryptedInputNo = await inputNo.encrypt();
      
      await predictionMarket.connect(user2).placeBet(
        0,
        encryptedInputNo.handles[0],
        encryptedInputNo.handles[1],
        encryptedInputNo.inputProof,
        { value: paymentNo }
      );
      
      // Check event state
      const event = await predictionMarket.getPredictionEvent(0);
      expect(event.totalYesShares).to.equal(sharesYes);
      expect(event.totalNoShares).to.equal(sharesNo);
      expect(event.totalPoolEth).to.equal(paymentYes + paymentNo);
    });
  });

  describe("Event Resolution and Rewards", function () {
    async function createEventWithBets() {
      const { predictionMarket, owner, user1, user2 } = await deployPredictionMarketFixture();
      
      const now = Math.floor(Date.now() / 1000);
      const startTime = now - 3600;  // Started 1 hour ago
      const endTime = now - 300;     // Ended 5 minutes ago
      const priceYes = ethers.parseEther("0.1");
      const priceNo = ethers.parseEther("0.1");
      
      await predictionMarket.createPredictionEvent(
        "Test prediction event",
        startTime,
        endTime,
        priceYes,
        priceNo
      );
      
      // Create bets during active period (we'll modify timestamp for testing)
      const activeStartTime = now - 600;
      const activeEndTime = now + 600;
      
      await predictionMarket.createPredictionEvent(
        "Active test event",
        activeStartTime,
        activeEndTime,
        priceYes,
        priceNo
      );
      
      // User1 bets YES on event 1
      const sharesYes = 10;
      const paymentYes = priceYes * BigInt(sharesYes);
      
      const inputYes = fhevm.createEncryptedInput(predictionMarket.target as string, user1.address);
      inputYes.add32(sharesYes);
      inputYes.addBool(true);
      const encryptedInputYes = await inputYes.encrypt();
      
      await predictionMarket.connect(user1).placeBet(
        1,
        encryptedInputYes.handles[0],
        encryptedInputYes.handles[1],
        encryptedInputYes.inputProof,
        { value: paymentYes }
      );
      
      // User2 bets NO on event 1
      const sharesNo = 5;
      const paymentNo = priceNo * BigInt(sharesNo);
      
      const inputNo = fhevm.createEncryptedInput(predictionMarket.target as string, user2.address);
      inputNo.add32(sharesNo);
      inputNo.addBool(false);
      const encryptedInputNo = await inputNo.encrypt();
      
      await predictionMarket.connect(user2).placeBet(
        1,
        encryptedInputNo.handles[0],
        encryptedInputNo.handles[1],
        encryptedInputNo.inputProof,
        { value: paymentNo }
      );
      
      return { 
        predictionMarket, 
        owner, 
        user1, 
        user2, 
        sharesYes, 
        sharesNo, 
        paymentYes, 
        paymentNo 
      };
    }

    it("Should resolve event", async function () {
      const { predictionMarket, owner } = await createEventWithBets();
      
      await expect(
        predictionMarket.resolveEvent(0, true)
      ).to.emit(predictionMarket, "EventResolved")
       .withArgs(0, true);
      
      const event = await predictionMarket.getPredictionEvent(0);
      expect(event.isResolved).to.be.true;
      expect(event.outcome).to.be.true;
    });

    it("Should not allow non-owner to resolve event", async function () {
      const { predictionMarket, user1 } = await createEventWithBets();
      
      await expect(
        predictionMarket.connect(user1).resolveEvent(0, true)
      ).to.be.revertedWith("Only owner can call this function");
    });

    it("Should not resolve event before end time", async function () {
      const { predictionMarket } = await createEventWithBets();
      
      await expect(
        predictionMarket.resolveEvent(1, true) // Event 1 is still active
      ).to.be.revertedWith("Event has not ended yet");
    });

    it("Should allow winners to claim rewards", async function () {
      const { 
        predictionMarket, 
        owner, 
        user1, 
        user2, 
        sharesYes, 
        paymentYes, 
        paymentNo 
      } = await createEventWithBets();
      
      // First, we need to end the event and resolve it
      // Modify event 1 to be ended
      await predictionMarket.resolveEvent(1, true); // YES wins
      
      const initialBalance = await ethers.provider.getBalance(user1.address);
      
      await expect(
        predictionMarket.connect(user1).claimRewards(1)
      ).to.emit(predictionMarket, "RewardsClaimed");
      
      const finalBalance = await ethers.provider.getBalance(user1.address);
      
      // User1 should receive the total pool since they're the only YES bettor
      // (minus gas costs, so we check if balance increased significantly)
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should not allow losers to claim rewards", async function () {
      const { predictionMarket, user2 } = await createEventWithBets();
      
      await predictionMarket.resolveEvent(1, true); // YES wins, user2 bet NO
      
      const tx = await predictionMarket.connect(user2).claimRewards(1);
      await tx.wait();
      
      // Check error code
      const [errorCode] = await predictionMarket.getLastError(user2.address);
      const decryptedError = await fhevm.userDecryptEuint(
        "euint32" as FhevmType,
        errorCode,
        predictionMarket.target as string,
        user2
      );
      expect(decryptedError).to.equal(5); // NO_WINNINGS
    });
  });

  describe("Edge Cases and Security", function () {
    it("Should handle zero shares bet", async function () {
      const { predictionMarket, user1 } = await deployPredictionMarketFixture();
      
      const now = Math.floor(Date.now() / 1000);
      await predictionMarket.createPredictionEvent(
        "Test event",
        now - 300,
        now + 3600,
        ethers.parseEther("0.1"),
        ethers.parseEther("0.1")
      );
      
      const input = fhevm.createEncryptedInput(predictionMarket.target as string, user1.address);
      input.add32(0); // zero shares
      input.addBool(true);
      const encryptedInput = await input.encrypt();
      
      const tx = await predictionMarket.connect(user1).placeBet(
        0,
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.inputProof,
        { value: 0 }
      );
      
      await tx.wait();
      
      const event = await predictionMarket.getPredictionEvent(0);
      expect(event.totalYesShares).to.equal(0);
      expect(event.totalPoolEth).to.equal(0);
    });

    it("Should handle emergency withdrawal", async function () {
      const { predictionMarket, owner } = await deployPredictionMarketFixture();
      
      // Send some ETH to the contract
      await owner.sendTransaction({
        to: predictionMarket.target,
        value: ethers.parseEther("1")
      });
      
      const initialBalance = await ethers.provider.getBalance(owner.address);
      
      await predictionMarket.emergencyWithdraw();
      
      const finalBalance = await ethers.provider.getBalance(owner.address);
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should transfer ownership", async function () {
      const { predictionMarket, owner, user1 } = await deployPredictionMarketFixture();
      
      await predictionMarket.transferOwnership(user1.address);
      
      // user1 should now be able to create events
      const now = Math.floor(Date.now() / 1000);
      await predictionMarket.connect(user1).createPredictionEvent(
        "New owner event",
        now + 3600,
        now + 7200,
        ethers.parseEther("0.1"),
        ethers.parseEther("0.1")
      );
      
      // Original owner should not be able to create events
      await expect(
        predictionMarket.createPredictionEvent(
          "Should fail",
          now + 3600,
          now + 7200,
          ethers.parseEther("0.1"),
          ethers.parseEther("0.1")
        )
      ).to.be.revertedWith("Only owner can call this function");
    });
  });
});