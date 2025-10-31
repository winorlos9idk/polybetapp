import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import type { FhevmType } from "@fhevm/hardhat-plugin";

describe("PredictionMarket - Sepolia Integration", function () {
  let predictionMarket: any;
  let owner: any;
  let user1: any;
  let user2: any;

  before(async function () {
    // Skip if not on Sepolia
    if (network.name !== "sepolia") {
      this.skip();
    }

    [owner, user1, user2] = await ethers.getSigners();

    // Deploy the contract
    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    predictionMarket = await PredictionMarket.deploy();
    await predictionMarket.waitForDeployment();

    console.log("PredictionMarket deployed to:", predictionMarket.target);
  });

  describe("Full Integration Test", function () {
    it("Should create event, place bets, resolve, and claim rewards", async function () {
      const now = Math.floor(Date.now() / 1000);
      const startTime = now + 60;    // Start in 1 minute
      const endTime = now + 300;     // End in 5 minutes
      const priceYes = ethers.parseEther("0.001"); // Lower prices for testnet
      const priceNo = ethers.parseEther("0.001");

      console.log("Creating prediction event...");

      // Create event
      const tx1 = await predictionMarket.createPredictionEvent(
        "Will ETH price be above $3000 in 5 minutes?",
        startTime,
        endTime,
        priceYes,
        priceNo
      );
      await tx1.wait();

      console.log("Event created, waiting for start time...");

      // Wait for event to start
      while (Math.floor(Date.now() / 1000) < startTime) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log("Event started, placing bets...");

      // User1 bets YES
      const sharesYes = 5;
      const paymentYes = priceYes * BigInt(sharesYes);

      const inputYes = fhevm.createEncryptedInput(predictionMarket.target as string, user1.address);
      inputYes.add32(sharesYes);
      inputYes.addBool(true);
      const encryptedInputYes = await inputYes.encrypt();

      const tx2 = await predictionMarket.connect(user1).placeBet(
        0,
        encryptedInputYes.handles[0],
        encryptedInputYes.handles[1],
        encryptedInputYes.inputProof,
        { value: paymentYes }
      );
      await tx2.wait();

      console.log("User1 placed YES bet");

      // User2 bets NO
      const sharesNo = 3;
      const paymentNo = priceNo * BigInt(sharesNo);

      const inputNo = fhevm.createEncryptedInput(predictionMarket.target as string, user2.address);
      inputNo.add32(sharesNo);
      inputNo.addBool(false);
      const encryptedInputNo = await inputNo.encrypt();

      const tx3 = await predictionMarket.connect(user2).placeBet(
        0,
        encryptedInputNo.handles[0],
        encryptedInputNo.handles[1],
        encryptedInputNo.inputProof,
        { value: paymentNo }
      );
      await tx3.wait();

      console.log("User2 placed NO bet");

      // Check event state
      const event = await predictionMarket.getPredictionEvent(0);
      expect(event.totalYesShares).to.equal(sharesYes);
      expect(event.totalNoShares).to.equal(sharesNo);
      expect(event.totalPoolEth).to.equal(paymentYes + paymentNo);

      console.log("Event state:", {
        totalYesShares: event.totalYesShares.toString(),
        totalNoShares: event.totalNoShares.toString(),
        totalPoolEth: ethers.formatEther(event.totalPoolEth)
      });

      // Verify user bets
      const user1Bet = await predictionMarket.getUserBet(0, user1.address);
      expect(user1Bet.hasPlacedBet).to.be.true;

      const user2Bet = await predictionMarket.getUserBet(0, user2.address);
      expect(user2Bet.hasPlacedBet).to.be.true;

      // Decrypt and verify bet details
      const decryptedShares1 = await fhevm.userDecryptEuint(
        "euint32" as FhevmType,
        user1Bet.encryptedShares,
        predictionMarket.target as string,
        user1
      );
      expect(decryptedShares1).to.equal(sharesYes);

      const decryptedDirection1 = await fhevm.userDecryptEbool(
        user1Bet.isYesBet,
        predictionMarket.target as string,
        user1
      );
      expect(decryptedDirection1).to.be.true;

      console.log("Bets verified, waiting for event to end...");

      // Wait for event to end
      while (Math.floor(Date.now() / 1000) < endTime) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log("Event ended, resolving...");

      // Resolve event (YES wins)
      const tx4 = await predictionMarket.resolveEvent(0, true);
      await tx4.wait();

      console.log("Event resolved: YES wins");

      // Check resolution
      const resolvedEvent = await predictionMarket.getPredictionEvent(0);
      expect(resolvedEvent.isResolved).to.be.true;
      expect(resolvedEvent.outcome).to.be.true;

      // User1 (winner) claims rewards
      const user1BalanceBefore = await ethers.provider.getBalance(user1.address);

      const tx5 = await predictionMarket.connect(user1).claimRewards(0);
      await tx5.wait();

      const user1BalanceAfter = await ethers.provider.getBalance(user1.address);

      console.log("User1 claimed rewards");
      console.log("Balance change:", ethers.formatEther(user1BalanceAfter - user1BalanceBefore));

      // User1 should have received more than their original bet
      expect(user1BalanceAfter).to.be.gt(user1BalanceBefore);

      // User2 (loser) tries to claim rewards (should get error)
      const tx6 = await predictionMarket.connect(user2).claimRewards(0);
      await tx6.wait();

      const [errorCode] = await predictionMarket.getLastError(user2.address);
      const decryptedError = await fhevm.userDecryptEuint(
        "euint32" as FhevmType,
        errorCode,
        predictionMarket.target as string,
        user2
      );
      expect(decryptedError).to.equal(5); // NO_WINNINGS

      console.log("User2 correctly got NO_WINNINGS error");
      console.log("Integration test completed successfully!");
    });
  });

  describe("Real-time Betting Scenario", function () {
    it("Should handle multiple users betting in real-time", async function () {
      const now = Math.floor(Date.now() / 1000);
      const startTime = now + 30;    // Start in 30 seconds
      const endTime = now + 180;     // End in 3 minutes
      const priceYes = ethers.parseEther("0.001");
      const priceNo = ethers.parseEther("0.0015"); // Different prices

      // Create event
      await predictionMarket.createPredictionEvent(
        "Real-time betting test",
        startTime,
        endTime,
        priceYes,
        priceNo
      );

      const eventId = (await predictionMarket.getEventCount()) - 1n;

      // Wait for start
      while (Math.floor(Date.now() / 1000) < startTime) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Multiple users place bets concurrently
      const betPromises = [];

      // User1: 10 YES shares
      const input1 = fhevm.createEncryptedInput(predictionMarket.target as string, user1.address);
      input1.add32(10);
      input1.addBool(true);
      const encrypted1 = await input1.encrypt();

      betPromises.push(
        predictionMarket.connect(user1).placeBet(
          eventId,
          encrypted1.handles[0],
          encrypted1.handles[1],
          encrypted1.inputProof,
          { value: priceYes * 10n }
        )
      );

      // User2: 7 NO shares
      const input2 = fhevm.createEncryptedInput(predictionMarket.target as string, user2.address);
      input2.add32(7);
      input2.addBool(false);
      const encrypted2 = await input2.encrypt();

      betPromises.push(
        predictionMarket.connect(user2).placeBet(
          eventId,
          encrypted2.handles[0],
          encrypted2.handles[1],
          encrypted2.inputProof,
          { value: priceNo * 7n }
        )
      );

      // Wait for all bets to complete
      const results = await Promise.all(betPromises);
      await Promise.all(results.map(tx => tx.wait()));

      // Verify final state
      const finalEvent = await predictionMarket.getPredictionEvent(eventId);
      expect(finalEvent.totalYesShares).to.equal(10);
      expect(finalEvent.totalNoShares).to.equal(7);

      console.log("Real-time betting test completed successfully!");
    });
  });
});