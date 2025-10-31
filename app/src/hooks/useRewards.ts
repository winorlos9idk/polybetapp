import { useState, useCallback } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { getContract } from 'viem';
import { DEFAULT_CONTRACT_ADDRESS, PREDICTION_MARKET_ABI } from '@/constants/config';
import { UserReward, RewardInfo } from '@/type';

export const useRewards = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const publicClient = usePublicClient();
  const { address } = useAccount();

  const getPendingReward = useCallback(async (eventId: number): Promise<bigint> => {
    if (!publicClient || !address) {
      throw new Error('No public client or wallet not connected');
    }

    try {
      const contract = getContract({
        address: DEFAULT_CONTRACT_ADDRESS as `0x${string}`,
        abi: PREDICTION_MARKET_ABI,
        client: { public: publicClient }
      });

      const reward = await contract.read.getPendingReward([BigInt(eventId), address]) as bigint;
      return reward;
    } catch (err: any) {
      console.error('Error fetching pending reward:', err);
      throw new Error(err.message || 'Failed to fetch pending reward');
    }
  }, [publicClient, address]);

  const hasClaimedReward = useCallback(async (eventId: number): Promise<boolean> => {
    if (!publicClient || !address) {
      throw new Error('No public client or wallet not connected');
    }

    try {
      const contract = getContract({
        address: DEFAULT_CONTRACT_ADDRESS as `0x${string}`,
        abi: PREDICTION_MARKET_ABI,
        client: { public: publicClient }
      });

      const claimed = await contract.read.hasClaimedReward([BigInt(eventId), address]) as boolean;
      return claimed;
    } catch (err: any) {
      console.error('Error checking claim status:', err);
      throw new Error(err.message || 'Failed to check claim status');
    }
  }, [publicClient, address]);

  // New optimized function using getRewardInfo
  const getRewardInfo = useCallback(async (eventId: number): Promise<RewardInfo> => {
    if (!publicClient || !address) {
      throw new Error('No public client or wallet not connected');
    }

    try {
      const contract = getContract({
        address: DEFAULT_CONTRACT_ADDRESS as `0x${string}`,
        abi: PREDICTION_MARKET_ABI,
        client: { public: publicClient }
      });

      const result = await contract.read.getRewardInfo([BigInt(eventId), address]) as [bigint, bigint, boolean, boolean];
      return {
        amount: result[0],
        originalAmount: result[1],
        claimed: result[2],
        withdrawn: result[3]
      };
    } catch (err: any) {
      console.error('Error fetching reward info:', err);
      throw new Error(err.message || 'Failed to fetch reward info');
    }
  }, [publicClient, address]);

  const getUserRewardForEvent = useCallback(async (eventId: number): Promise<UserReward> => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError('');

    try {
      const rewardInfo = await getRewardInfo(eventId);

      return {
        eventId,
        pendingAmount: rewardInfo.amount,
        claimed: rewardInfo.claimed,
        originalAmount: rewardInfo.originalAmount,
        withdrawn: rewardInfo.withdrawn
      };
    } catch (err: any) {
      console.error('Error fetching user reward:', err);
      const errorMessage = err.message || 'Failed to fetch user reward';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [getRewardInfo, address]);

  const getUserRewardsForEvents = useCallback(async (eventIds: number[]): Promise<UserReward[]> => {
    if (!address || eventIds.length === 0) {
      return [];
    }

    setIsLoading(true);
    setError('');

    try {
      const rewardPromises = eventIds.map(eventId => getUserRewardForEvent(eventId));
      const rewards = await Promise.all(rewardPromises);
      return rewards.filter(reward => reward.pendingAmount > 0n);
    } catch (err: any) {
      console.error('Error fetching user rewards:', err);
      const errorMessage = err.message || 'Failed to fetch user rewards';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [getUserRewardForEvent, address]);

  return {
    getPendingReward,
    hasClaimedReward,
    getRewardInfo,
    getUserRewardForEvent,
    getUserRewardsForEvents,
    isLoading,
    error
  };
};