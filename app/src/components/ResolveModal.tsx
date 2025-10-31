import React, { useState } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { PredictionEvent } from '@/hooks/useEvents';
import { useContractWrite } from '@/hooks/useContract';
import LoadingSpinner from './LoadingSpinner';

interface ResolveModalProps {
  event: PredictionEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onResolveSuccess?: () => void;
}

const ResolveModal: React.FC<ResolveModalProps> = ({
  event,
  isOpen,
  onClose,
  onResolveSuccess
}) => {
  const [selectedOutcome, setSelectedOutcome] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { resolveBet, error } = useContractWrite();

  const handleSubmit = async () => {
    if (!event || selectedOutcome === null) return;

    setIsSubmitting(true);
    try {
      await resolveBet(event.id, selectedOutcome);
      onResolveSuccess?.();
      onClose();
      setSelectedOutcome(null);
    } catch (error) {
      console.error('Failed to resolve event:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedOutcome(null);
  };

  if (!isOpen || !event) return null;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl border border-white/10 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Resolve Event</h2>
              <p className="text-sm text-white/60 mt-1">
                Select the outcome for Event #{event.id}
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-white/60 hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Event Details */}
          <div className="bg-white/5 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-white mb-3 line-clamp-3">
              {event.description}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-white/60 mb-1">Start Time</div>
                <div className="text-white">{formatDate(event.startTime)}</div>
              </div>
              <div>
                <div className="text-white/60 mb-1">End Time</div>
                <div className="text-white">{formatDate(event.endTime)}</div>
              </div>
            </div>
          </div>

          {/* Outcome Selection */}
          <div className="mb-6">
            <h4 className="text-white font-medium mb-4">Select the actual outcome:</h4>
            <div className="space-y-3">
              <button
                onClick={() => setSelectedOutcome(true)}
                className={`w-full p-4 rounded-lg border-2 transition-all flex items-center justify-between ${
                  selectedOutcome === true
                    ? 'border-green-400 bg-green-400/10'
                    : 'border-white/20 bg-white/5 hover:border-white/30'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <CheckCircle className={`w-6 h-6 ${
                    selectedOutcome === true ? 'text-green-400' : 'text-white/60'
                  }`} />
                  <div className="text-left">
                    <div className={`font-medium ${
                      selectedOutcome === true ? 'text-green-400' : 'text-white'
                    }`}>
                      YES - Prediction was correct
                    </div>
                    <div className="text-sm text-white/60">
                      The event outcome matches the YES prediction
                    </div>
                  </div>
                </div>
                {selectedOutcome === true && (
                  <div className="w-4 h-4 rounded-full bg-green-400"></div>
                )}
              </button>

              <button
                onClick={() => setSelectedOutcome(false)}
                className={`w-full p-4 rounded-lg border-2 transition-all flex items-center justify-between ${
                  selectedOutcome === false
                    ? 'border-red-400 bg-red-400/10'
                    : 'border-white/20 bg-white/5 hover:border-white/30'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <XCircle className={`w-6 h-6 ${
                    selectedOutcome === false ? 'text-red-400' : 'text-white/60'
                  }`} />
                  <div className="text-left">
                    <div className={`font-medium ${
                      selectedOutcome === false ? 'text-red-400' : 'text-white'
                    }`}>
                      NO - Prediction was incorrect
                    </div>
                    <div className="text-sm text-white/60">
                      The event outcome does not match the YES prediction
                    </div>
                  </div>
                </div>
                {selectedOutcome === false && (
                  <div className="w-4 h-4 rounded-full bg-red-400"></div>
                )}
              </button>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-yellow-200 font-medium mb-1">Important</div>
                <div className="text-yellow-100/80 text-sm">
                  This action cannot be reversed. Please carefully verify the actual outcome
                  before submitting the resolution.
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div>
                  <div className="text-red-200 font-medium mb-1">Error</div>
                  <div className="text-red-100/80 text-sm">{error}</div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={selectedOutcome === null || isSubmitting}
              className={`flex-1 btn btn-primary flex items-center justify-center space-x-2 ${
                selectedOutcome === null ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner />
                  <span>Resolving...</span>
                </>
              ) : (
                <span>Resolve Event</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResolveModal;