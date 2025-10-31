import React, { useState, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { formatEther } from 'viem';
import { TrendingUp, TrendingDown, Clock, CheckCircle, ExternalLink, Wallet, AlertCircle, Eye, EyeOff, Gift } from 'lucide-react';
import { useUserBets } from '@/hooks/useUserBets';
import { useContractWrite } from '@/hooks/useContract';
import { useRewards } from '@/hooks/useRewards';
import { userDecryptEuint32, userDecryptEbool } from '@/utils/fhe';
import { DEFAULT_CONTRACT_ADDRESS } from '@/constants/config';
import { EventReward } from '@/type';
import LoadingSpinner from './LoadingSpinner';

interface DecryptedData {
  shares?: number;
  direction?: boolean;
  isDecryptingShares?: boolean;
  isDecryptingDirection?: boolean;
  sharesError?: string;
  directionError?: string;
}

const MyBets: React.FC = () => {
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { bets, isLoading, error, refetch } = useUserBets();
  const { claimWinnings, withdrawReward, isLoading: isClaimingRewards } = useContractWrite();
  const { getUserRewardForEvent } = useRewards();
  const [decryptedBets, setDecryptedBets] = useState<Record<string, DecryptedData>>({});
  const [eventRewards, setEventRewards] = useState<Record<number, EventReward>>({});
  const [loadingRewards, setLoadingRewards] = useState<Record<number, boolean>>({});

  const handleDecryptDirection = async (bet: any) => {
    if (!walletClient) {
      console.error('Wallet not connected');
      return;
    }

    const betKey = `${bet.eventId}-${bet.txHash}`;
    
    // If already decrypted, hide the data
    if (decryptedBets[betKey]?.direction !== undefined) {
      setDecryptedBets(prev => ({
        ...prev,
        [betKey]: {
          ...prev[betKey],
          direction: undefined,
          directionError: undefined
        }
      }));
      return;
    }
    
    // Set loading state
    setDecryptedBets(prev => ({
      ...prev,
      [betKey]: { 
        ...prev[betKey],
        isDecryptingDirection: true 
      }
    }));

    try {
      const decryptedDirection = await userDecryptEbool(bet.isYes, DEFAULT_CONTRACT_ADDRESS, walletClient);

      // Update decrypted data
      setDecryptedBets(prev => ({
        ...prev,
        [betKey]: {
          ...prev[betKey],
          direction: decryptedDirection,
          isDecryptingDirection: false
        }
      }));
    } catch (error: any) {
      console.error('Failed to decrypt direction:', error);
      setDecryptedBets(prev => ({
        ...prev,
        [betKey]: {
          ...prev[betKey],
          isDecryptingDirection: false,
          directionError: error.message || 'Decryption failed'
        }
      }));
    }
  };

  const handleDecryptShares = async (bet: any) => {
    if (!walletClient) {
      console.error('Wallet not connected');
      return;
    }

    const betKey = `${bet.eventId}-${bet.txHash}`;
    
    // If already decrypted, hide the data
    if (decryptedBets[betKey]?.shares !== undefined) {
      setDecryptedBets(prev => ({
        ...prev,
        [betKey]: {
          ...prev[betKey],
          shares: undefined,
          sharesError: undefined
        }
      }));
      return;
    }
    
    // Set loading state
    setDecryptedBets(prev => ({
      ...prev,
      [betKey]: { 
        ...prev[betKey],
        isDecryptingShares: true 
      }
    }));

    try {
      const decryptedShares = await userDecryptEuint32(bet.shares, DEFAULT_CONTRACT_ADDRESS, walletClient);

      // Update decrypted data
      setDecryptedBets(prev => ({
        ...prev,
        [betKey]: {
          ...prev[betKey],
          shares: decryptedShares,
          isDecryptingShares: false
        }
      }));
    } catch (error: any) {
      console.error('Failed to decrypt shares:', error);
      setDecryptedBets(prev => ({
        ...prev,
        [betKey]: {
          ...prev[betKey],
          isDecryptingShares: false,
          sharesError: error.message || 'Decryption failed'
        }
      }));
    }
  };

  const handleClaimRewards = async (eventId: number) => {
    try {
      await claimWinnings(eventId);
      // Refresh bets after claiming
      setTimeout(() => refetch(), 2000);
    } catch (error) {
      console.error('Failed to claim rewards:', error);
    }
  };

  const checkRewardForEvent = async (eventId: number) => {
    if (loadingRewards[eventId] || !isConnected) return;
    
    setLoadingRewards(prev => ({ ...prev, [eventId]: true }));
    try {
      const rewardData = await getUserRewardForEvent(eventId);
      setEventRewards(prev => ({ 
        ...prev, 
        [eventId]: rewardData 
      }));
    } catch (error) {
      console.error('Failed to check reward:', error);
    } finally {
      setLoadingRewards(prev => ({ ...prev, [eventId]: false }));
    }
  };

  const handleWithdrawReward = async (eventId: number) => {
    try {
      await withdrawReward(eventId);
      // Refresh rewards after withdrawal
      setTimeout(() => {
        checkRewardForEvent(eventId);
        refetch();
      }, 2000);
    } catch (error) {
      console.error('Failed to withdraw reward:', error);
    }
  };

  // Check rewards for resolved events
  useEffect(() => {
    if (bets.length > 0) {
      bets.forEach(bet => {
        if (bet.event?.resolved && bet.event?.decryptionDone && !eventRewards[bet.eventId]) {
          checkRewardForEvent(bet.eventId);
        }
      });
    }
  }, [bets, isConnected]);

  const getBetStatus = (bet: any) => {
    if (!bet.event) return { status: 'unknown', color: 'gray', text: 'Unknown Event' };
    
    if (!bet.event.resolved) {
      if (bet.event.endTime * 1000 > Date.now()) {
        return { status: 'active', color: 'blue', text: 'Active' };
      } else {
        return { status: 'pending', color: 'yellow', text: 'Pending Resolution' };
      }
    }
    
    // Event is resolved but we can't determine win/loss without decrypting user's bet
    // User needs to claim to find out the result
    if (!bet.claimed) {
      return { status: 'resolved-unclaimed', color: 'blue', text: 'Resolved - Check Result' };
    } else {
      return { status: 'resolved-claimed', color: 'gray', text: 'Resolved - Claimed' };
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Remove this function as we no longer show the direction

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved-unclaimed':
        return <CheckCircle className="w-4 h-4 text-blue-400" />;
      case 'resolved-claimed':
        return <CheckCircle className="w-4 h-4 text-gray-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'active':
        return <Clock className="w-4 h-4 text-blue-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-16">
          <Wallet className="w-16 h-16 text-white/60 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-white mb-2">Connect Your Wallet</h2>
          <p className="text-white/60">
            Please connect your wallet to view your betting history.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-16">
          <LoadingSpinner />
          <p className="text-white/60 mt-4">Loading your bets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-16">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-white mb-2">Error Loading Bets</h2>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="btn btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Bets</h1>
        <p className="text-white/60">
          View all your predictions and their outcomes
        </p>
      </div>

      {bets.length === 0 ? (
        <div className="text-center py-16">
          <TrendingUp className="w-16 h-16 text-white/60 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-white mb-2">No Bets Yet</h2>
          <p className="text-white/60 mb-6">
            You haven't placed any bets yet. Start by browsing available prediction events.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bets.map((bet) => {
            const betStatus = getBetStatus(bet);
            
            return (
              <div
                key={`${bet.eventId}-${bet.txHash}`}
                className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:border-white/20 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="font-semibold text-white mb-2 line-clamp-2 break-words">
                      {bet.event?.description || `Event #${bet.eventId}`}
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-2 text-sm text-white/60">
                      <span>Event #{bet.eventId}</span>
                      <span>•</span>
                      <span>{formatDate(bet.timestamp)}</span>
                      {bet.txHash && bet.txHash !== '0x' && (
                        <>
                          <span>•</span>
                          <a
                            href={`https://sepolia.etherscan.io/tx/${bet.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 hover:text-white transition-colors"
                          >
                            <span>View Transaction</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {getStatusIcon(betStatus.status)}
                    <span className={`text-sm font-medium whitespace-nowrap text-${betStatus.color}-400`}>
                      {betStatus.text}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-yellow-400">🔒</span>
                        <span className="text-sm font-medium text-white">
                          Your Prediction
                        </span>
                      </div>
                      <button
                        onClick={() => handleDecryptDirection(bet)}
                        disabled={decryptedBets[`${bet.eventId}-${bet.txHash}`]?.isDecryptingDirection}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center space-x-1"
                      >
                        {decryptedBets[`${bet.eventId}-${bet.txHash}`]?.isDecryptingDirection ? (
                          <>
                            <LoadingSpinner />
                            <span>Decrypting...</span>
                          </>
                        ) : decryptedBets[`${bet.eventId}-${bet.txHash}`]?.direction !== undefined ? (
                          <>
                            <EyeOff className="w-3 h-3" />
                            <span>Hide</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3" />
                            <span>Decrypt</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className={`font-semibold ${
                      decryptedBets[`${bet.eventId}-${bet.txHash}`]?.direction !== undefined 
                        ? (decryptedBets[`${bet.eventId}-${bet.txHash}`]?.direction 
                          ? 'text-green-400' : 'text-red-400')
                        : 'text-yellow-400'
                    }`}>
                      {decryptedBets[`${bet.eventId}-${bet.txHash}`]?.directionError ? (
                        <span className="text-red-400 text-xs">Decryption failed</span>
                      ) : decryptedBets[`${bet.eventId}-${bet.txHash}`]?.direction !== undefined ? (
                        <div className="flex items-center space-x-1">
                          {decryptedBets[`${bet.eventId}-${bet.txHash}`]?.direction ? (
                            <>
                              <TrendingUp className="w-4 h-4" />
                              <span>YES</span>
                            </>
                          ) : (
                            <>
                              <TrendingDown className="w-4 h-4" />
                              <span>NO</span>
                            </>
                          )}
                        </div>
                      ) : (
                        '***'
                      )}
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-sm text-white/60 mb-1">Amount Bet</div>
                    <div className="font-semibold text-white truncate">
                      {Number(formatEther(bet.amount)).toFixed(4)} ETH
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-yellow-400">🔒</span>
                        <span className="text-sm text-white/60">Shares</span>
                      </div>
                      <button
                        onClick={() => handleDecryptShares(bet)}
                        disabled={decryptedBets[`${bet.eventId}-${bet.txHash}`]?.isDecryptingShares}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center space-x-1"
                      >
                        {decryptedBets[`${bet.eventId}-${bet.txHash}`]?.isDecryptingShares ? (
                          <>
                            <LoadingSpinner />
                            <span>Decrypting...</span>
                          </>
                        ) : decryptedBets[`${bet.eventId}-${bet.txHash}`]?.shares !== undefined ? (
                          <>
                            <EyeOff className="w-3 h-3" />
                            <span>Hide</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3" />
                            <span>Decrypt</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className={`font-semibold truncate ${
                      decryptedBets[`${bet.eventId}-${bet.txHash}`]?.shares !== undefined 
                        ? 'text-white' 
                        : 'text-yellow-400'
                    }`}>
                      {decryptedBets[`${bet.eventId}-${bet.txHash}`]?.sharesError ? (
                        <span className="text-red-400 text-xs">Decryption failed</span>
                      ) : decryptedBets[`${bet.eventId}-${bet.txHash}`]?.shares !== undefined 
                        ? decryptedBets[`${bet.eventId}-${bet.txHash}`]?.shares 
                        : '***'
                      }
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-lg p-3">
                    {bet.event?.resolved && (
                      <>
                        <div className="text-sm text-white/60 mb-1">Final Result</div>
                        <div className={`font-semibold flex items-center space-x-1 ${
                          bet.event.outcome ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {bet.event.outcome ? (
                            <>
                              <TrendingUp className="w-4 h-4" />
                              <span>YES</span>
                            </>
                          ) : (
                            <>
                              <TrendingDown className="w-4 h-4" />
                              <span>NO</span>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Show reward information for resolved events */}
                {bet.event?.resolved && bet.event?.decryptionDone && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    {loadingRewards[bet.eventId] ? (
                      <div className="flex items-center space-x-2 text-white/60">
                        <LoadingSpinner />
                        <span>Checking rewards...</span>
                      </div>
                    ) : eventRewards[bet.eventId] && (eventRewards[bet.eventId].pendingAmount > 0n || eventRewards[bet.eventId].withdrawn || eventRewards[bet.eventId].claimed) ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Gift className="w-4 h-4 text-yellow-400" />
                            <span className="text-white font-medium">
                              {eventRewards[bet.eventId].withdrawn ? 'Reward Withdrawn' : 'Your Reward'}
                            </span>
                          </div>
                          <div className="text-lg font-bold text-green-400">
                            {formatEther(eventRewards[bet.eventId].withdrawn ? 
                              eventRewards[bet.eventId].originalAmount : 
                              eventRewards[bet.eventId].pendingAmount)} ETH
                          </div>
                        </div>
                        
                        {eventRewards[bet.eventId].pendingAmount > 0n && (
                          <button
                            onClick={() => handleWithdrawReward(bet.eventId)}
                            disabled={isClaimingRewards}
                            className="btn btn-success w-full flex items-center justify-center space-x-2"
                          >
                            {isClaimingRewards ? (
                              <>
                                <LoadingSpinner />
                                <span>Withdrawing...</span>
                              </>
                            ) : (
                              <>
                                <Wallet className="w-4 h-4" />
                                <span>Withdraw Reward</span>
                              </>
                            )}
                          </button>
                        )}
                        
                        {eventRewards[bet.eventId].pendingAmount === 0n && !eventRewards[bet.eventId].withdrawn && (
                          <div className="text-center text-white/60 text-sm">
                            {eventRewards[bet.eventId].claimed ? 
                              "You didn't win this prediction" : 
                              "No rewards available"
                            }
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => checkRewardForEvent(bet.eventId)}
                        className="btn btn-secondary flex items-center space-x-2"
                      >
                        <Gift className="w-4 h-4" />
                        <span>Check Rewards</span>
                      </button>
                    )}
                  </div>
                )}

                {betStatus.status === 'resolved-unclaimed' && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <button
                      onClick={() => handleClaimRewards(bet.eventId)}
                      disabled={isClaimingRewards}
                      className="btn btn-primary flex items-center space-x-2"
                    >
                      {isClaimingRewards ? (
                        <>
                          <LoadingSpinner />
                          <span>Claiming...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>Check Result & Claim</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyBets;