import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { DEFAULT_CONTRACT_ADDRESS, PREDICTION_MARKET_ABI } from '@/constants/config';

export const useOwner = () => {
  const { address } = useAccount();
  const [isOwner, setIsOwner] = useState(false);
  const [ownerAddress, setOwnerAddress] = useState<string>('');

  // Read the owner address from the contract
  const { data: contractOwner, isLoading, error, refetch } = useReadContract({
    address: DEFAULT_CONTRACT_ADDRESS as `0x${string}`,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'owner',
  });

  useEffect(() => {
    if (contractOwner && address) {
      const owner = contractOwner as string;
      setOwnerAddress(owner);
      setIsOwner(owner.toLowerCase() === address.toLowerCase());
    } else {
      setIsOwner(false);
      setOwnerAddress('');
    }
  }, [contractOwner, address]);

  return {
    isOwner,
    ownerAddress,
    isLoading,
    error,
    refetch
  };
};