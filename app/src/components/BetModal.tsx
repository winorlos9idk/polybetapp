import React, { useState, useCallback } from 'react';
import { X, TrendingUp, TrendingDown, Loader2, AlertTriangle } from 'lucide-react';
import { formatEther } from 'viem';
import { PredictionEvent } from '@/hooks/useEvents';
import { useContractWrite } from '@/hooks/useContract';
import { useFHE } from '@/utils/fhe';

interface BetModalProps {
  event: PredictionEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onBetSuccess?: () => void;
}

const BetModal: React.FC<BetModalProps> = ({ event, isOpen, onClose, onBetSuccess }) => {
  const [selectedDirection, setSelectedDirection] = useState<'yes' | 'no' | null>(null);
  const [betAmount, setBetAmount] = useState<string>('');
  const [isPlacingBet, setIsPlacingBet] = useState(false);

  const { placeBet } = useContractWrite();
  const { isInitialized, isInitializing, error: fheError } = useFHE();

  const resetForm = useCallback(() => {
    setSelectedDirection(null);
    setBetAmount('');
    setIsPlacingBet(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handlePlaceBet = async () => {
    if (!event || !selectedDirection || !betAmount) return;

    try {
      setIsPlacingBet(true);
      
      // Convert bet amount to wei

      const shares = BigInt(betAmount);
      // Calculate encrypted shares based on direction and price
      const price = selectedDirection === 'yes' ? event.priceYes : event.priceNo;
      // const shares = (amountInWei * BigInt(10000)) / price; // Calculate shares with precision
      const amountInWei = (shares)*price;

      await placeBet(
        event.id,
        shares,
        selectedDirection === 'yes',
        amountInWei
      );

      // Success - close modal and reset
      handleClose();
      onBetSuccess?.();
    } catch (error) {
      console.error('Failed to place bet:', error);
    } finally {
      setIsPlacingBet(false);
    }
  };

  const getEstimatedPayout = () => {
    if (!betAmount || !event || !selectedDirection) return '0';
    
    try {
      const amount = parseFloat(betAmount);
      const price = parseFloat(formatEther(selectedDirection === 'yes' ? event.priceYes : event.priceNo));
      const shares = amount * price;
      return shares.toFixed(4)+"ETH";
    } catch {
      return '0';
    }
  };


  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl border border-white/10 w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">Place Your Bet</h2>
          <button
            onClick={handleClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Event Info */}
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <h3 className="font-medium text-white mb-2 line-clamp-2">
              {event.description}
            </h3>
            <div className="text-sm text-white/60">
              Event #{event.id} • Pool: {formatEther(event.totalEth)} ETH
            </div>
          </div>

          {/* Direction Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-white">
              Choose Your Prediction
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedDirection('yes')}
                className={`p-4 rounded-lg border transition-all ${
                  selectedDirection === 'yes'
                    ? 'border-green-500 bg-green-500/10 text-green-400'
                    : 'border-white/20 hover:border-white/30 text-white'
                }`}
              >
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="font-semibold">YES</span>
                </div>
                <div className="text-sm opacity-80">
                  {formatEther(event.priceYes)} ETH per share
                </div>
              </button>
              
              <button
                onClick={() => setSelectedDirection('no')}
                className={`p-4 rounded-lg border transition-all ${
                  selectedDirection === 'no'
                    ? 'border-red-500 bg-red-500/10 text-red-400'
                    : 'border-white/20 hover:border-white/30 text-white'
                }`}
              >
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <TrendingDown className="w-5 h-5" />
                  <span className="font-semibold">NO</span>
                </div>
                <div className="text-sm opacity-80">
                  {formatEther(event.priceNo)} ETH per share
                </div>
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">
              Bet Shares(Amount)
            </label>
            <input
              type="number"
              step="1"
              min="1"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
              placeholder="1"
            />
          </div>

          {/* Payout Estimation */}
          {selectedDirection && betAmount && (
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <h4 className="text-sm font-medium text-blue-200 mb-2">Estimated Outcome</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-blue-100">
                  <span>Total ETH:</span>
                  <span>{getEstimatedPayout()}</span>
                </div>
                <div className="flex justify-between text-blue-100/70">
                  <span>Your bet amount:</span>
                  <span>{betAmount} Shares</span>
                </div>
              </div>
            </div>
          )}

          {/* FHE Status Notice */}
          {!isInitialized && (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-200">
                  Please initialize FHE encryption first by clicking the "Initialize FHE" button in the header.
                </div>
              </div>
            </div>
          )}

          {/* Privacy Notice */}
          {isInitialized && (
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-purple-200">
                  Your bet amount and direction will be encrypted and remain private until the event is resolved.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex space-x-3 p-6 border-t border-white/10">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePlaceBet}
            disabled={!selectedDirection || !betAmount || isPlacingBet || parseFloat(betAmount) <= 0 || !isInitialized || !!fheError || isInitializing}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {isPlacingBet ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Placing Bet...</span>
              </>
            ) : isInitializing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>FHE Loading...</span>
              </>
            ) : !isInitialized ? (
              <span>Initialize FHE First</span>
            ) : fheError ? (
              <span>FHE Error</span>
            ) : (
              <span>Place Bet</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BetModal;