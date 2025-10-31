import { useState, useEffect, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { getContract } from 'viem';
import { DEFAULT_CONTRACT_ADDRESS, PREDICTION_MARKET_ABI } from '@/constants/config';

export interface PredictionEvent {
  id: number;
  description: string;
  startTime: number;
  endTime: number;
  priceYes: bigint;
  priceNo: bigint;
  resolved: boolean;
  outcome: boolean;
  totalEth: bigint;
  totalYes: string; // encrypted handle
  totalNo: string; // encrypted handle
  decryptedYes: number;
  decryptedNo: number;
  decryptionDone: boolean;
}

export const useEvents = () => {
  const [events, setEvents] = useState<PredictionEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const publicClient = usePublicClient();

  const fetchEvents = useCallback(async () => {
    if (!publicClient) {
      setError('No public client available');
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

      // Get total event count
      const eventCount = await contract.read.getEventCount() as bigint;
      const totalEvents = Number(eventCount);

      console.log('Total events found:', totalEvents);

      if (totalEvents === 0) {
        setEvents([]);
        setIsLoading(false);
        return;
      }

      // Fetch all events
      const eventPromises = [];
      for (let i = 0; i < totalEvents; i++) {
        eventPromises.push(contract.read.getPredicEvent([BigInt(i)]));
      }

      const eventResults = await Promise.all(eventPromises);

      // Transform the results
      const transformedEvents: PredictionEvent[] = eventResults.map((result: any, index) => {
        console.log('Event', index, 'raw data:', result);
        
        return {
          id: Number(result.id),
          description: result.description,
          startTime: Number(result.startTime),
          endTime: Number(result.endTime),
          priceYes: result.priceYes,
          priceNo: result.priceNo,
          resolved: result.resolved,
          outcome: result.outcome,
          totalEth: result.totalEth,
          totalYes: result.totalYes,
          totalNo: result.totalNo,
          decryptedYes: Number(result.decryptedYes),
          decryptedNo: Number(result.decryptedNo),
          decryptionDone: result.decryptionDone
        };
      });

      console.log('Transformed events:', transformedEvents);
      setEvents(transformedEvents);

    } catch (err: any) {
      console.error('Error fetching events:', err);
      setError(err.message || 'Failed to fetch events');
    } finally {
      setIsLoading(false);
    }
  }, [publicClient]);

  // Auto-fetch on component mount
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    isLoading,
    error,
    refetch: fetchEvents
  };
};