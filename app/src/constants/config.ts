import { NetworkConfig } from '@/type';

// Zama FHE Configuration for Sepolia testnet
export const SEPOLIA_CONFIG = {
  aclContractAddress: "0x687820221192C5B662b25367F70076A37bc79b6c",
  kmsContractAddress: "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC",
  inputVerifierContractAddress: "0xbc91f3daD1A5F19F8390c400196e58073B6a0BC4",
  verifyingContractAddressDecryption: "0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1",
  verifyingContractAddressInputVerification: "0x7048C39f048125eDa9d678AEbaDfB22F7900a29F",
  chainId: 11155111,
  gatewayChainId: 55815,
  network: "https://sepolia.infura.io/v3/YOUR_INFURA_KEY", // Replace with actual key
  relayerUrl: "https://relayer.testnet.zama.cloud",
};

export const NETWORKS: Record<string, NetworkConfig> = {
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY', // Replace with actual key
    blockExplorer: 'https://sepolia.etherscan.io',
    contractAddress: '', // Will be filled after deployment
  },
  localhost: {
    chainId: 31337,
    name: 'Local Hardhat',
    rpcUrl: 'http://localhost:8545',
    blockExplorer: '',
    contractAddress: '', // Will be filled after deployment
  }
};

// Error messages mapping
export const ERROR_MESSAGES = {
  0: 'No error',
  1: 'Betting is not active for this event',
  2: 'Insufficient payment for the bet',
  3: 'You have already placed a bet on this event',
  4: 'Event has not been resolved yet',
  5: 'No winnings available to claim'
};

// Contract ABI - key functions for the PredictionMarket contract
export const PREDICTION_MARKET_ABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "desc", "type": "string" },
      { "internalType": "uint256", "name": "start", "type": "uint256" },
      { "internalType": "uint256", "name": "end", "type": "uint256" },
      { "internalType": "uint256", "name": "yesPrice", "type": "uint256" },
      { "internalType": "uint256", "name": "noPrice", "type": "uint256" }
    ],
    "name": "createEvent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "eventId", "type": "uint256" },
      { "internalType": "externalEuint32", "name": "shares", "type": "bytes32" },
      { "internalType": "externalEbool", "name": "isYes", "type": "bytes32" },
      { "internalType": "bytes", "name": "proof", "type": "bytes" }
    ],
    "name": "placeBet",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "eventId", "type": "uint256" },
      { "internalType": "bool", "name": "outcome", "type": "bool" }
    ],
    "name": "resolveEvent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "eventId", "type": "uint256" }
    ],
    "name": "claimReward",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "eventId", "type": "uint256" }
    ],
    "name": "withdrawReward",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "eventId", "type": "uint256" },
      { "internalType": "address", "name": "user", "type": "address" }
    ],
    "name": "getPendingReward",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "eventId", "type": "uint256" },
      { "internalType": "address", "name": "user", "type": "address" }
    ],
    "name": "hasClaimedReward",
    "outputs": [
      { "internalType": "bool", "name": "", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "eventId", "type": "uint256" },
      { "internalType": "address", "name": "user", "type": "address" }
    ],
    "name": "getRewardInfo",
    "outputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "uint256", "name": "originalAmount", "type": "uint256" },
      { "internalType": "bool", "name": "claimed", "type": "bool" },
      { "internalType": "bool", "name": "withdrawn", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "eventId", "type": "uint256" }
    ],
    "name": "getPredicEvent",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "id", "type": "uint256" },
          { "internalType": "string", "name": "description", "type": "string" },
          { "internalType": "uint256", "name": "startTime", "type": "uint256" },
          { "internalType": "uint256", "name": "endTime", "type": "uint256" },
          { "internalType": "uint256", "name": "priceYes", "type": "uint256" },
          { "internalType": "uint256", "name": "priceNo", "type": "uint256" },
          { "internalType": "bool", "name": "resolved", "type": "bool" },
          { "internalType": "bool", "name": "outcome", "type": "bool" },
          { "internalType": "uint256", "name": "totalEth", "type": "uint256" },
          { "internalType": "euint64", "name": "totalYes", "type": "bytes32" },
          { "internalType": "euint64", "name": "totalNo", "type": "bytes32" },
          { "internalType": "uint256", "name": "decryptedYes", "type": "uint256" },
          { "internalType": "uint256", "name": "decryptedNo", "type": "uint256" },
          { "internalType": "bool", "name": "decryptionDone", "type": "bool" }
        ],
        "internalType": "struct PredictionMarket.Event",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "eventId", "type": "uint256" },
      { "internalType": "address", "name": "user", "type": "address" }
    ],
    "name": "getBet",
    "outputs": [
      {
        "components": [
          { "internalType": "euint32", "name": "shares", "type": "bytes32" },
          { "internalType": "ebool", "name": "isYes", "type": "bytes32" },
          { "internalType": "bool", "name": "placed", "type": "bool" },
          { "internalType": "uint256", "name": "actualEthAmount", "type": "uint256" }
        ],
        "internalType": "struct PredictionMarket.Bet",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getEventCount",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "eventId", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "description", "type": "string" }
    ],
    "name": "EventCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "eventId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" }
    ],
    "name": "BetPlaced",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "eventId", "type": "uint256" },
      { "indexed": false, "internalType": "bool", "name": "outcome", "type": "bool" }
    ],
    "name": "EventResolved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": true, "internalType": "uint256", "name": "eventId", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "RewardCalculated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "RewardWithdrawn",
    "type": "event"
  }
] as const;

// Default contract address (update after deployment)
export const DEFAULT_CONTRACT_ADDRESS = "0x42B0C00B90cCdbB6Ccb1392a5Db313DdA7EF7CFc";

// UI Constants
export const UI_CONFIG = {
  REFRESH_INTERVAL: 5000, // 5 seconds
  MAX_DESCRIPTION_LENGTH: 200,
  MIN_BET_AMOUNT: 0.0001, // Minimum bet in ETH
  MAX_BET_AMOUNT: 10,    // Maximum bet in ETH
  DATE_FORMAT: 'yyyy-MM-dd HH:mm',
  CURRENCY_DECIMALS: 4,
};

// Event status calculation helpers
export const getEventStatus = (startTime: number, endTime: number, isResolved: boolean) => {
  const now = Math.floor(Date.now() / 1000);

  if (isResolved) return 'resolved';
  if (now < startTime) return 'upcoming';
  if (now >= startTime && now <= endTime) return 'active';
  return 'ended';
};

export const isEventActive = (startTime: number, endTime: number, isResolved: boolean) => {
  const now = Math.floor(Date.now() / 1000);
  return now >= startTime && now <= endTime && !isResolved;
};