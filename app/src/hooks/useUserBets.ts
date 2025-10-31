import { useState, useEffect, useCallback } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { getContract } from 'viem';
import { DEFAULT_CONTRACT_ADDRESS, PREDICTION_MARKET_ABI } from '@/constants/config';
import { PredictionEvent } from './useEvents';

export interface UserBet {
  eventId: number;
  event: PredictionEvent | null;
  shares: string; // encrypted handle
  isYes: string; // encrypted handle
  amount: bigint;
  timestamp: number;
  claimed: boolean;
  txHash: string;
  blockNumber: bigint;
}

export const useUserBets = () => {
  const [bets, setBets] = useState<UserBet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const publicClient = usePublicClient();
  const { address } = useAccount();

  const fetchUserBets = useCallback(async () => {
    if (!publicClient || !address) {
      setError('No public client available or wallet not connected');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Get contract instance
      const contract = getContract({
        address: DEFAULT_CONTRACT_ADDRESS as `0x${string}`,
        abi: PREDICTION_MARKET_ABI,
        client: { public: publicClient }
      });

      // Get total number of events
      const eventCount = await contract.read.getEventCount() as bigint;
      const totalEvents = Number(eventCount);
      
      console.log('Total events to check:', totalEvents);

      // Get all events and user bets in parallel
      const promises = [];
      for (let i = 0; i < totalEvents; i++) {
        promises.push(
          Promise.all([
            contract.read.getPredicEvent([BigInt(i)]),
            contract.read.getBet([BigInt(i), address])
          ])
        );
      }

      const results = await Promise.all(promises);
      
      // Filter out events where user has placed bets
      const userBets: UserBet[] = [];
      
      for (let i = 0; i < results.length; i++) {
        const [eventResult, betResult] = results[i];
        const bet = betResult as any;
        
        // Only include if user has placed a bet (bet.placed is true)
        if (bet.placed) {
          const event: PredictionEvent = {
            id: Number(eventResult.id),
            description: eventResult.description,
            startTime: Number(eventResult.startTime),
            endTime: Number(eventResult.endTime),
            priceYes: eventResult.priceYes,
            priceNo: eventResult.priceNo,
            resolved: eventResult.resolved,
            outcome: eventResult.outcome,
            totalEth: eventResult.totalEth,
            totalYes: eventResult.totalYes,
            totalNo: eventResult.totalNo,
            decryptedYes: Number(eventResult.decryptedYes),
            decryptedNo: Number(eventResult.decryptedNo),
            decryptionDone: eventResult.decryptionDone
          };

          // Use actual ETH amount from contract, encrypted data shown as ***
          userBets.push({
            eventId: i,
            event,
            shares: bet.shares || '0', // This is encrypted - will show ***
            isYes: bet.isYes || 'false', // This is encrypted - will show ***
            amount: bet.actualEthAmount || BigInt(0), // Use actual ETH amount (public)
            timestamp: event.startTime, // Use event start time as placeholder
            claimed: !bet.placed, // If bet.placed is false, it might have been claimed
            txHash: '0x', // We don't have this from direct contract calls
            blockNumber: BigInt(0), // We don't have this from direct contract calls
          });
        }
      }

      // Sort by event ID (newest first)
      userBets.sort((a, b) => b.eventId - a.eventId);

      console.log('Found user bets:', userBets);
      setBets(userBets);

    } catch (err: any) {
      console.error('Error fetching user bets:', err);
      setError(err.message || 'Failed to fetch user bets');
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, address]);

  // Auto-fetch on component mount and when address changes
  useEffect(() => {
    if (address) {
      fetchUserBets();
    } else {
      setBets([]);
    }
  }, [fetchUserBets, address]);

  return {
    bets,
    isLoading,
    error,
    refetch: fetchUserBets
  };
};