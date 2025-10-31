import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import { FhevmType } from "@fhevm/hardhat-plugin";
task("prediction:create-event")
  .addParam("desc", "Event description")
  .addParam("priceyes", "Price for YES bets in wei")
  .addParam("priceno", "Price for NO bets in wei")
  .setAction(async function (taskArguments: TaskArguments, { ethers, deployments }) {
    const { desc, priceyes, priceno } = taskArguments;

    // Calculate start time (current time + 30 seconds)
    const starttime = Math.floor(Date.now() / 1000) + 30;
    // Calculate end time (start time + 120 seconds)
    const endtime = starttime + 120;
    const predictionMarketDeployment = await deployments.get("PredictionMarket");
    const predictionMarket = await ethers.getContractAt("PredictionMarket", predictionMarketDeployment.address);

    console.log("Creating prediction event...");
    console.log("Description:", desc);
    console.log("Start time:", new Date((starttime) * 1000).toISOString());
    console.log("End time:", new Date((endtime) * 1000).toISOString());
    console.log("YES price:", priceyes, "wei");
    console.log("NO price:", priceno, "wei");

    const tx = await predictionMarket.createEvent(
      desc,
      starttime,
      endtime,
      priceyes,
      priceno
    );

    await tx.wait();
    console.log("Event created successfully!");
    console.log("Transaction hash:", tx.hash);

    const eventCount = await predictionMarket.getEventCount();
    console.log("Event ID:", (eventCount - 1n).toString());
  });

task("prediction:place-bet")
  .addParam("eventid", "Event ID")
  .addParam("shares", "Number of shares to buy")
  .addParam("direction", "Bet direction: 'yes' or 'no'")
  .addParam("payment", "Payment amount in wei")
  .setAction(async function (taskArguments: TaskArguments, { ethers, deployments, fhevm }) {
    const { eventid, shares, direction, payment } = taskArguments;
    await fhevm.initializeCLIApi()
    const signers = await ethers.getSigners();
    const signer = signers[0];
    const predictionMarketDeployment = await deployments.get("PredictionMarket");
    const predictionMarket = await ethers.getContractAt("PredictionMarket", predictionMarketDeployment.address);

    console.log("Placing encrypted bet...");
    console.log("Event ID:", eventid);
    console.log("Shares:", shares);
    console.log("Direction:", direction);
    console.log("Payment:", payment, "wei");

    // Create encrypted inputs
    const input = fhevm.createEncryptedInput(predictionMarketDeployment.address, signer.address);
    input.add32(parseInt(shares));  // encrypted shares
    input.addBool(direction.toLowerCase() === "yes");  // encrypted direction
    const encryptedInput = await input.encrypt();

    const tx = await predictionMarket.placeBet(
      eventid,
      encryptedInput.handles[0],  // encrypted shares
      encryptedInput.handles[1],  // encrypted direction
      encryptedInput.inputProof,
      { value: payment }
    );

    await tx.wait();
    console.log("Bet placed successfully!");
    console.log("Transaction hash:", tx.hash);
  });

task("prediction:resolve-event")
  .addParam("eventid", "Event ID")
  .addParam("outcome", "Event outcome: 'yes' or 'no'")
  .setAction(async function (taskArguments: TaskArguments, { ethers, deployments }) {
    const { eventid, outcome } = taskArguments;
    const predictionMarketDeployment = await deployments.get("PredictionMarket");
    const predictionMarket = await ethers.getContractAt("PredictionMarket", predictionMarketDeployment.address);

    console.log("Resolving event...");
    console.log("Event ID:", eventid);
    console.log("Outcome:", outcome);

    const tx = await predictionMarket.resolveEvent(
      eventid,
      outcome.toLowerCase() === "yes"
    );

    await tx.wait();
    console.log("Event resolved successfully!");
    console.log("Transaction hash:", tx.hash);
  });

task("prediction:claim-rewards")
  .addParam("eventid", "Event ID")
  .setAction(async function (taskArguments: TaskArguments, { ethers, deployments }) {
    const { eventid } = taskArguments;
    const predictionMarketDeployment = await deployments.get("PredictionMarket");
    const predictionMarket = await ethers.getContractAt("PredictionMarket", predictionMarketDeployment.address);

    console.log("Claiming rewards for event:", eventid);

    const tx = await predictionMarket.claimReward(eventid);
    await tx.wait();

    console.log("Rewards claimed successfully!");
    console.log("Transaction hash:", tx.hash);
  });

task("prediction:get-event")
  .addParam("eventid", "Event ID")
  .setAction(async function (taskArguments: TaskArguments, { ethers, deployments }) {
    const eventid = taskArguments.eventid;
    const predictionMarketDeployment = await deployments.get("PredictionMarket");
    const predictionMarket = await ethers.getContractAt("PredictionMarket", predictionMarketDeployment.address);
    const event = await predictionMarket.getPredicEvent(eventid);
    // const timenow = await predictionMarket.getTime()

    console.log("Event Details:");
    console.log("ID:", event.id.toString());
    console.log("Description:", event.description);
    // console.log("Now time:", new Date(Number(timenow) * 1000).toISOString());
    console.log("Start time:", new Date(Number(event.startTime) * 1000).toISOString());
    console.log("End time:", new Date(Number(event.endTime) * 1000).toISOString());
    console.log("YES price:", event.priceYes.toString(), "wei");
    console.log("NO price:", event.priceNo.toString(), "wei");
    console.log("Is resolved:", event.resolved);
    console.log("Outcome:", event.outcome ? "YES" : "NO");
    console.log("Total YES shares:", event.totalYes.toString());
    console.log("Total NO shares:", event.totalNo.toString());
    console.log("Total pool ETH:", event.totalEth.toString(), "wei");
  });

task("prediction:get-user-bet")
  .addParam("eventid", "Event ID")
  .addParam("userindex", "User address")
  .setAction(async function (taskArguments: TaskArguments, { ethers, deployments, fhevm }) {
    const { eventid, userindex } = taskArguments;

    const signers = await ethers.getSigners();
    const signer = signers[userindex];
    const predictionMarketDeployment = await deployments.get("PredictionMarket");
    const predictionMarket = await ethers.getContractAt("PredictionMarket", predictionMarketDeployment.address);

    const bet = await predictionMarket.getBet(eventid, signer.address);

    console.log("User Bet Details:");
    console.log("Has placed bet:", bet.placed);

    if (bet.placed) {
      // Decrypt the encrypted values for the user
      try {
        // const decryptedAmount = await fhevm.userDecryptEuint(
        //   FhevmType.euint64,
        //   bet.amount,
        //   predictionMarketDeployment.address,
        //   signer
        // );
        // console.log("Bet amount:", decryptedAmount.toString(), "wei");

        const decryptedShares = await fhevm.userDecryptEuint(
          FhevmType.euint32,
          bet.shares,
          predictionMarketDeployment.address,
          signer
        );
        console.log("Shares:", decryptedShares.toString());

        const decryptedDirection = await fhevm.userDecryptEbool(
          bet.isYes,
          predictionMarketDeployment.address,
          signer
        );
        console.log("Direction:", decryptedDirection ? "YES" : "NO");
      } catch (error) {
        console.log("Note: Could not decrypt values (may not have permission)");
        // console.log("Encrypted amount handle:", bet.amount);
        console.log("Encrypted shares handle:", bet.shares);
        console.log("Encrypted direction handle:", bet.isYes);
      }
    }
  });

task("prediction:list-events")
  .setAction(async function (_taskArguments: TaskArguments, { ethers, deployments }) {
    const predictionMarketDeployment = await deployments.get("PredictionMarket");
    const predictionMarket = await ethers.getContractAt("PredictionMarket", predictionMarketDeployment.address);

    const eventCount = await predictionMarket.getEventCount();
    console.log("Total events:", eventCount.toString());
    console.log("");

    for (let i = 0; i < eventCount; i++) {
      try {
        const event = await predictionMarket.getPredicEvent(i);

        console.log(`Event ${i}:`);
        console.log("  Description:", event.description);
        console.log("  Start:", new Date(Number(event.startTime) * 1000).toISOString());
        console.log("  End:", new Date(Number(event.endTime) * 1000).toISOString());
        console.log("  Resolved:", event.resolved);
        if (event.resolved) {
          console.log("  Outcome:", event.outcome ? "YES" : "NO");
        }
        console.log("  YES shares:", event.totalYes.toString());
        console.log("  NO shares:", event.totalNo.toString());
        console.log("  Pool ETH:", event.totalEth.toString(), "wei");
        console.log("");
      } catch (error) {
        console.log(`  Error fetching event ${i}:`, error);
      }
    }
  });