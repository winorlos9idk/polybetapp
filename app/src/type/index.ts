export interface PredictionEvent {
  id: number;
  description: string;
  startTime: number;
  endTime: number;
  priceYes: bigint;
  priceNo: bigint;
  isResolved: boolean;
  outcome: boolean;
  totalYesShares: number;
  totalNoShares: number;
  totalPoolEth: bigint;
}

export interface UserBet {
  encryptedAmount: string;
  encryptedShares: string;
  isYesBet: string;
  hasPlacedBet: boolean;
}

export interface EncryptedInput {
  handles: string[];
  inputProof: string;
}

export interface BetFormData {
  shares: number;
  direction: 'yes' | 'no';
  payment: string;
}

export interface EventFormData {
  description: string;
  startTime: string;
  endTime: string;
  priceYes: string;
  priceNo: string;
}

export enum BetDirection {
  YES = 'yes',
  NO = 'no'
}

export enum EventStatus {
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  ENDED = 'ended',
  RESOLVED = 'resolved'
}

export interface ErrorCode {
  NO_ERROR: 0;
  BETTING_NOT_ACTIVE: 1;
  INSUFFICIENT_PAYMENT: 2;
  ALREADY_BET: 3;
  EVENT_NOT_RESOLVED: 4;
  NO_WINNINGS: 5;
}

export interface FHEInstance {
  createEncryptedInput: (contractAddress: string, userAddress: string) => any;
  userDecrypt: (...args: any[]) => Promise<any>;
  generateKeypair: () => { publicKey: string; privateKey: string };
  createEIP712: (publicKey: string, contractAddresses: string[], startTimeStamp: string, durationDays: string) => any;
  publicDecrypt: (handles: string[]) => Promise<Record<string, any>>;
}

export interface ContractConfig {
  address: string;
  abi: any[];
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  contractAddress: string;
}

export interface RewardInfo {
  amount: bigint;
  originalAmount: bigint;
  claimed: boolean;
  withdrawn: boolean;
}

export interface UserReward {
  eventId: number;
  pendingAmount: bigint;
  claimed: boolean;
  originalAmount: bigint;
  withdrawn: boolean;
}

// EventReward is the same as UserReward since UserReward already includes eventId
export interface EventReward extends UserReward {}