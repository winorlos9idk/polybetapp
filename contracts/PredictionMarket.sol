// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, euint64, ebool, externalEuint32, externalEbool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title PredictionMarket - A confidential prediction market using FHE
/// @notice Implements encrypted betting with decryption for settlement
/// @dev Uses Zama's FHE to keep bet amounts and directions private until resolution
contract PredictionMarket is SepoliaConfig {
    /// @notice Represents a prediction event that users can bet on
    /// @dev All encrypted fields are kept confidential until resolution
    struct Event {
        uint256 id; // Unique identifier for the event
        string description; // Human-readable description of what's being predicted
        uint256 startTime; // Timestamp when betting opens
        uint256 endTime; // Timestamp when betting closes
        uint256 priceYes; // Fixed price for YES bets (currently unused in logic)
        uint256 priceNo; // Fixed price for NO bets (currently unused in logic)
        bool resolved; // Whether the event outcome has been determined
        bool outcome; // The actual outcome (true = YES wins, false = NO wins)
        uint256 totalEth; // Total ETH wagered on this event (public)
        euint64 totalYes; // Total encrypted amount bet on YES
        euint64 totalNo; // Total encrypted amount bet on NO
        uint256 decryptedYes; // Decrypted total YES amount (available after resolution)
        uint256 decryptedNo; // Decrypted total NO amount (available after resolution)
        bool decryptionDone; // Whether totals have been successfully decrypted
    }

    /// @notice Represents a user's bet on a specific event
    /// @dev All bet details are encrypted to maintain privacy
    struct Bet {
        euint32 shares; // Encrypted number of shares purchased (for future use)
        ebool isYes; // Encrypted bet direction (true = YES, false = NO)
        bool placed; // Whether this bet has been placed (prevents double betting)
        uint256 actualEthAmount; // Actual ETH amount spent (public for display)
    }

    /// @notice Represents a user's reward information for a specific event
    /// @dev Tracks both reward amount and claim status for better record keeping
    struct RewardInfo {
        uint256 amount; // The current reward amount in wei (0 after withdrawal)
        uint256 originalAmount; // The original reward amount before withdrawal
        bool claimed; // Whether the reward has been claimed
        bool withdrawn; // Whether the reward has been withdrawn
    }

    // Storage mappings
    mapping(uint256 => Event) public events; // eventId => Event details
    mapping(uint256 => mapping(address => Bet)) public bets; // eventId => user => Bet details
    mapping(uint256 => mapping(address => RewardInfo)) public rewardInfo; // eventId => user => reward information
    mapping(uint256 => uint256) public requestToEvent; // decryption requestId => eventId
    mapping(uint256 => address) public requestToUser; // decryption requestId => user address
    mapping(address => uint256[]) public userBets; // user => list of eventIds they bet on

    // State variables
    uint256 public eventCount; // Total number of events created
    address public owner; // Contract owner (can create events and resolve them)

    // Events for off-chain monitoring
    event EventCreated(uint256 indexed eventId, string description);
    event BetPlaced(uint256 indexed eventId, address indexed user);
    event EventResolved(uint256 indexed eventId, bool outcome);
    event TotalsDecrypted(uint256 indexed eventId, uint256 yes, uint256 no);
    event RewardCalculated(address indexed user, uint256 indexed eventId, uint256 amount);
    event RewardWithdrawn(address indexed user, uint256 amount);

    /// @notice Restricts function access to contract owner only
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    /// @notice Initializes the contract with deployer as owner
    constructor() {
        owner = msg.sender;
    }

    /// @notice Creates a new prediction event
    /// @dev Only owner can create events. Sets up encrypted totals with proper ACL permissions
    /// @param desc Human-readable description of the prediction event
    /// @param start Timestamp when betting opens (must be in the future)
    /// @param end Timestamp when betting closes (must be after start)
    /// @param yesPrice Fixed price for YES bets (currently unused in payout logic)
    /// @param noPrice Fixed price for NO bets (currently unused in payout logic)
    function createEvent(
        string memory desc,
        uint256 start,
        uint256 end,
        uint256 yesPrice,
        uint256 noPrice
    ) external onlyOwner {
        require(start > block.timestamp, "Invalid start");
        require(end > start, "Invalid end");
        require(yesPrice > 0 && noPrice > 0, "Invalid prices");

        // Initialize new event with encrypted zero totals
        events[eventCount] = Event({
            id: eventCount,
            description: desc,
            startTime: start,
            endTime: end,
            priceYes: yesPrice,
            priceNo: noPrice,
            resolved: false,
            outcome: false,
            totalEth: 0,
            totalYes: FHE.asEuint64(0), // Encrypted zero for YES total
            totalNo: FHE.asEuint64(0), // Encrypted zero for NO total
            decryptedYes: 0,
            decryptedNo: 0,
            decryptionDone: false
        });

        // Grant contract access to encrypted totals for future updates
        FHE.allowThis(events[eventCount].totalYes);
        FHE.allowThis(events[eventCount].totalNo);

        emit EventCreated(eventCount, desc);
        eventCount++;
    }

    /// @notice Places an encrypted bet on a prediction event
    /// @dev Validates external encrypted inputs and updates totals while maintaining privacy
    /// @param eventId The ID of the event to bet on
    /// @param shares External encrypted number of shares to purchase (currently unused in payout)
    /// @param isYes External encrypted bet direction (true for YES, false for NO)
    /// @param proof Cryptographic proof for the encrypted inputs
    function placeBet(
        uint256 eventId,
        externalEuint32 shares,
        externalEbool isYes,
        bytes calldata proof
    ) external payable {
        require(eventId < eventCount, "Event not found");
        Event storage ev = events[eventId];

        // Validate betting conditions
        require(block.timestamp >= ev.startTime, "Not started");
        require(block.timestamp <= ev.endTime, "Ended");
        require(!ev.resolved, "Resolved");
        require(!bets[eventId][msg.sender].placed, "Already bet");
        require(msg.value > 0, "No payment");

        // Convert external encrypted inputs to internal encrypted types
        euint32 userShares = FHE.fromExternal(shares, proof);
        ebool userIsYes = FHE.fromExternal(isYes, proof);
        // euint64 userAmount = FHE.asEuint64(uint64(msg.value));

        // Store encrypted bet details
        bets[eventId][msg.sender] = Bet({
            shares: userShares,
            isYes: userIsYes,
            placed: true,
            actualEthAmount: msg.value
        });

        // Update totals based on encrypted bet direction without revealing which side was chosen
        euint32 addYes = FHE.select(userIsYes, userShares, FHE.asEuint32(0)); // Add to YES if isYes=true, else 0
        euint32 addNo = FHE.select(userIsYes, FHE.asEuint32(0), userShares); // Add to NO if isYes=false, else 0

        ev.totalYes = FHE.add(ev.totalYes, addYes);
        ev.totalNo = FHE.add(ev.totalNo, addNo);
        ev.totalEth += msg.value; // Public total for transparency

        // Set ACL permissions for encrypted values
        FHE.allowThis(userShares);
        FHE.allow(userShares, msg.sender);
        FHE.allowThis(userIsYes);
        FHE.allow(userIsYes, msg.sender);
        FHE.allowThis(ev.totalYes); // Contract needs access to update totals
        FHE.allowThis(ev.totalNo);

        emit BetPlaced(eventId, msg.sender);
    }

    /// @notice Resolves a prediction event with the actual outcome
    /// @dev Only owner can resolve. Triggers asynchronous decryption of encrypted totals
    /// @param eventId The ID of the event to resolve
    /// @param outcome The actual result (true = YES wins, false = NO wins)
    function resolveEvent(uint256 eventId, bool outcome) external onlyOwner {
        require(eventId < eventCount, "Event not found");
        Event storage ev = events[eventId];

        // Validate resolution conditions
        require(block.timestamp > ev.endTime, "Not ended");
        require(!ev.resolved, "Already resolved");

        ev.outcome = outcome;

        // Request asynchronous decryption of encrypted totals for payout calculation
        bytes32[] memory cts = new bytes32[](2);
        cts[0] = FHE.toBytes32(ev.totalYes); // Convert encrypted YES total to bytes for decryption
        cts[1] = FHE.toBytes32(ev.totalNo); // Convert encrypted NO total to bytes for decryption

        // Submit decryption request to the KMS (Key Management System)
        uint256 reqId = FHE.requestDecryption(cts, this.totalsCallback.selector);
        requestToEvent[reqId] = eventId; // Map request ID to event for callback processing

        emit EventResolved(eventId, outcome);
    }

    /// @notice Callback function called by KMS after decrypting event totals
    /// @dev This function is automatically called when decryption is complete
    /// @param reqId The request ID from the original decryption request
    /// @param yesTotal Decrypted total amount wagered on YES
    /// @param noTotal Decrypted total amount wagered on NO
    /// @param sigs Cryptographic signatures proving the decryption is valid
    function totalsCallback(uint256 reqId, uint256 yesTotal, uint256 noTotal, bytes[] memory sigs) public {
        // Verify that the decryption results are authentic and haven't been tampered with
        FHE.checkSignatures(reqId, sigs);

        uint256 eventId = requestToEvent[reqId];
        Event storage ev = events[eventId];

        // Store the decrypted totals for payout calculations
        ev.decryptedYes = yesTotal;
        ev.decryptedNo = noTotal;
        ev.resolved = true;
        ev.decryptionDone = true; // Flag that event is ready for reward claims

        emit TotalsDecrypted(eventId, yesTotal, noTotal);
        delete requestToEvent[reqId]; // Clean up mapping to save gas
    }

    /// @notice Initiates the reward claim process for a user's bet
    /// @dev Triggers asynchronous decryption of user's bet details to calculate payout
    /// @param eventId The ID of the resolved event to claim rewards from
    function claimReward(uint256 eventId) external {
        require(eventId < eventCount, "Event not found");
        Event storage ev = events[eventId];
        require(ev.decryptionDone, "Not ready"); // Event totals must be decrypted first
        require(!rewardInfo[eventId][msg.sender].claimed, "Already claimed"); // Prevent double claiming

        Bet storage userBet = bets[eventId][msg.sender];
        require(userBet.placed, "No bet");

        // Request decryption of user's encrypted bet details
        bytes32[] memory cts = new bytes32[](2);
        cts[0] = FHE.toBytes32(userBet.shares); // User's bet amount
        // Convert boolean bet direction to integer for decryption (1 = YES, 0 = NO)
        cts[1] = FHE.toBytes32(FHE.select(userBet.isYes, FHE.asEuint32(1), FHE.asEuint32(0)));

        // Submit decryption request to KMS
        uint256 reqId = FHE.requestDecryption(cts, this.userBetCallback.selector);
        requestToEvent[reqId] = eventId; // Map request to event
        requestToUser[reqId] = msg.sender; // Map request to user

        rewardInfo[eventId][msg.sender].claimed = true; // Mark as claimed to prevent double claiming
    }

    /// @notice Callback function called by KMS after decrypting user's bet details
    /// @dev Calculates and records winnings based on the decrypted bet information
    /// @param reqId The request ID from the original decryption request
    /// @param shares Decrypted shares the user wagered
    /// @param isYesNum Decrypted bet direction as number (1 = YES, 0 = NO)
    /// @param sigs Cryptographic signatures proving the decryption is valid
    function userBetCallback(uint256 reqId, uint256 shares, uint256 isYesNum, bytes[] memory sigs) public {
        // Verify that the decryption results are authentic
        FHE.checkSignatures(reqId, sigs);

        uint256 eventId = requestToEvent[reqId];
        address user = requestToUser[reqId];
        Event storage ev = events[eventId];

        // Convert decrypted direction back to boolean
        bool userBetYes = (isYesNum == 1);
        bool won = (userBetYes == ev.outcome); // Check if user's prediction was correct

        // Calculate winnings if user won
        if (won && ev.totalEth > 0) {
            uint256 totalWinShares = ev.outcome ? ev.decryptedYes : ev.decryptedNo;

            if (totalWinShares > 0) {
                // Payout formula: (user's shares * total ETH) / total winning shares
                // This gives the user a proportional share of the total ETH pool
                uint256 winAmount = (ev.totalEth * shares) / totalWinShares;

                // Add to user's pending rewards for this specific event
                rewardInfo[eventId][user].amount = winAmount;
                rewardInfo[eventId][user].originalAmount = winAmount;

                emit RewardCalculated(user, eventId, winAmount);
            }
        }

        // Clean up mappings to save gas
        delete requestToEvent[reqId];
        delete requestToUser[reqId];
    }

    /// @notice Allows users to withdraw their rewards for a specific event
    /// @dev Transfers pending rewards to the user and marks as withdrawn
    /// @param eventId The ID of the event to withdraw rewards from
    function withdrawReward(uint256 eventId) external {
        require(eventId < eventCount, "Event not found");
        require(events[eventId].resolved, "Event not resolved");
        require(rewardInfo[eventId][msg.sender].claimed, "Rewards not calculated yet");

        uint256 amount = rewardInfo[eventId][msg.sender].amount;
        require(amount > 0, "No rewards to withdraw");
        require(address(this).balance >= amount, "Insufficient contract balance");

        // Reset pending rewards and mark as withdrawn before transfer to prevent reentrancy
        rewardInfo[eventId][msg.sender].amount = 0;
        rewardInfo[eventId][msg.sender].withdrawn = true;

        // Transfer rewards to user
        payable(msg.sender).transfer(amount);

        emit RewardWithdrawn(msg.sender, amount);
    }

    // View functions for querying contract state

    /// @notice Retrieves public information about a prediction event
    /// @dev Returns non-encrypted event details that are safe to expose publicly
    /// @param eventId The ID of the event to query
    /// @return event
    function getPredicEvent(uint256 eventId) external view returns (Event memory) {
        require(eventId < eventCount, "Event not found");
        Event storage ev = events[eventId];
        return ev;
    }

    /// @notice Retrieves a user's encrypted bet details for a specific event
    /// @dev Returns encrypted values that can only be decrypted by authorized parties
    /// @param eventId The ID of the event to query
    /// @param user The address of the user whose bet to retrieve
    /// @return bet
    function getBet(uint256 eventId, address user) external view returns (Bet memory) {
        Bet storage bet = bets[eventId][user];
        return bet;
    }

    /// @notice Retrieves a user's encrypted cumulative rewards balance
    /// @dev Returns encrypted value that can only be decrypted by the user
    /// @param user The address of the user whose rewards to retrieve
    /// @return Encrypted total rewards earned by the user across all events
    // function getRewards(address user) external view returns (euint64) {
    //     return rewards[user];
    // }

    /// @notice Retrieves both encrypted and decrypted totals for an event
    /// @dev Encrypted totals are always available, decrypted ones only after resolution
    /// @param eventId The ID of the event to query
    /// @return totalYes Encrypted total amount bet on YES
    /// @return totalNo Encrypted total amount bet on NO
    /// @return decryptedYes Decrypted total amount bet on YES (0 if not yet decrypted)
    /// @return decryptedNo Decrypted total amount bet on NO (0 if not yet decrypted)
    function getEventTotals(
        uint256 eventId
    ) external view returns (euint64 totalYes, euint64 totalNo, uint256 decryptedYes, uint256 decryptedNo) {
        require(eventId < eventCount, "Event not found");
        Event storage ev = events[eventId];
        return (ev.totalYes, ev.totalNo, ev.decryptedYes, ev.decryptedNo);
    }

    /// @notice Returns the total number of events created
    /// @dev Useful for iterating through all events or checking latest event ID
    /// @return The current event count (next event will have this ID)
    function getEventCount() external view returns (uint256) {
        return eventCount;
    }

    /// @notice Retrieves the pending reward amount for a user for a specific event
    /// @dev Returns the amount of ETH the user can withdraw for this event
    /// @param eventId The ID of the event to query
    /// @param user The address of the user to query
    /// @return The pending reward amount in wei for this event
    function getPendingReward(uint256 eventId, address user) external view returns (uint256) {
        return rewardInfo[eventId][user].amount;
    }

    /// @notice Checks if a user has already claimed rewards for a specific event
    /// @dev Returns true if the user has claimed, false otherwise
    /// @param eventId The ID of the event to check
    /// @param user The address of the user to check
    /// @return Whether the user has claimed rewards for this event
    function hasClaimedReward(uint256 eventId, address user) external view returns (bool) {
        return rewardInfo[eventId][user].claimed;
    }

    /// @notice Retrieves complete reward information for a user for a specific event
    /// @dev Returns comprehensive reward status including original amount and withdrawal status
    /// @param eventId The ID of the event to query
    /// @param user The address of the user to query
    /// @return amount The current reward amount in wei for this event
    /// @return originalAmount The original reward amount before any withdrawal
    /// @return claimed Whether the reward has been claimed
    /// @return withdrawn Whether the reward has been withdrawn
    function getRewardInfo(
        uint256 eventId,
        address user
    ) external view returns (uint256 amount, uint256 originalAmount, bool claimed, bool withdrawn) {
        RewardInfo storage info = rewardInfo[eventId][user];
        return (info.amount, info.originalAmount, info.claimed, info.withdrawn);
    }

    // Administrative functions for contract management

    /// @notice Emergency function to withdraw all ETH from the contract
    /// @dev Only owner can call this. Should only be used in extreme circumstances
    /// @dev This could disrupt ongoing betting and payouts - use with extreme caution
    function emergencyWithdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    /// @notice Transfers ownership of the contract to a new address
    /// @dev Only current owner can transfer ownership. New owner gains all administrative privileges
    /// @param newOwner The address that will become the new owner
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}
