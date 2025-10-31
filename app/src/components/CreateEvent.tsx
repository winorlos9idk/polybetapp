import React, { useState } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { parseEther, getContract } from 'viem';
import { Plus, Calendar, DollarSign, Shield, AlertTriangle, Lock } from 'lucide-react';
import { DEFAULT_CONTRACT_ADDRESS, PREDICTION_MARKET_ABI } from '@/constants/config';
import { useOwner } from '@/hooks/useOwner';

interface CreateEventProps {
  onEventCreated: () => void;
}

const CreateEvent: React.FC<CreateEventProps> = ({ onEventCreated }) => {
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { isOwner, ownerAddress, isLoading: ownerLoading } = useOwner();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  // Function to get default datetime values
  const getDefaultDateTimes = () => {
    const now = new Date();
    const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    // Format for datetime-local input (YYYY-MM-DDTHH:MM)
    const formatDateTime = (date: Date) => {
      return date.toISOString().slice(0, 16);
    };
    
    return {
      startTime: formatDateTime(startTime),
      endTime: formatDateTime(endTime)
    };
  };
  
  const [formData, setFormData] = useState(() => {
    const defaultTimes = getDefaultDateTimes();
    return {
      description: '',
      startTime: defaultTimes.startTime,
      endTime: defaultTimes.endTime,
      yesPrice: '0.001',
      noPrice: '0.001'
    };
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !walletClient || !publicClient) {
      setError('Please connect your wallet and try again');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Convert timestamps to Unix timestamps
      const startTimeUnix = Math.floor(new Date(formData.startTime).getTime() / 1000);
      const endTimeUnix = Math.floor(new Date(formData.endTime).getTime() / 1000);
      
      // Convert prices to wei
      const yesPriceWei = parseEther(formData.yesPrice);
      const noPriceWei = parseEther(formData.noPrice);
      
      // Validate data
      if (startTimeUnix <= Math.floor(Date.now() / 1000)) {
        throw new Error('Start time must be in the future');
      }
      if (endTimeUnix <= startTimeUnix) {
        throw new Error('End time must be after start time');
      }
      if (!formData.description.trim()) {
        throw new Error('Description is required');
      }
      
      // Get contract instance
      const contract = getContract({
        address: DEFAULT_CONTRACT_ADDRESS as `0x${string}`,
        abi: PREDICTION_MARKET_ABI,
        client: {
          public: publicClient,
          wallet: walletClient
        }
      });
      
      // Call contract function
      const hash = await contract.write.createEvent([
        formData.description.trim(),
        BigInt(startTimeUnix),
        BigInt(endTimeUnix),
        yesPriceWei,
        noPriceWei
      ]);
      
      console.log('Transaction submitted:', hash);
      
      // Wait for transaction to be mined
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('Transaction confirmed:', receipt);
      
      // Reset form with new default times
      const defaultTimes = getDefaultDateTimes();
      setFormData({
        description: '',
        startTime: defaultTimes.startTime,
        endTime: defaultTimes.endTime,
        yesPrice: '0.1',
        noPrice: '0.1'
      });
      
      onEventCreated();
    } catch (err: any) {
      console.error('Error creating event:', err);
      setError(err.reason || err.message || 'Failed to create event');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="card text-center py-12">
        <Shield className="w-16 h-16 text-white/40 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h3>
        <p className="text-white/60">
          Please connect your wallet to create prediction events.
        </p>
      </div>
    );
  }

  if (ownerLoading) {
    return (
      <div className="card text-center py-12">
        <div className="loading-spinner mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Loading...</h3>
        <p className="text-white/60">
          Checking permissions...
        </p>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="card text-center py-12">
        <Lock className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Access Denied</h3>
        <p className="text-white/60 mb-4">
          Only the contract owner can create prediction events.
        </p>
        <div className="bg-red-50/10 border border-red-500/20 rounded-lg p-4 text-left">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-red-200 mb-1">Permission Required</h4>
              <p className="text-sm text-red-100/80">
                Contract Owner: <span className="font-mono">{ownerAddress}</span>
              </p>
              <p className="text-sm text-red-100/80 mt-1">
                Please connect with the owner wallet to create events.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="magic-text text-4xl font-bold mb-4" style={{fontFamily: "'Cinzel', serif"}}>Stwórz Wydarzenie</h2>
        <p className="text-yellow-200 text-lg font-semibold" style={{fontFamily: "'Cinzel', serif", textShadow: '0 0 10px rgba(255,215,0,0.5)'}}>
          Stwórz nowy rynek predykcji z zaszyfrowanymi zakładami.
        </p>
      </div>
      
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-red-200 mb-1">Error</h4>
                  <p className="text-sm text-red-100/80">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          <div>
            <label className="label">Opis Wydarzenia</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="input h-24 resize-none"
              placeholder="np. Czy Bitcoin osiągnie $100K do końca 2024?"
              maxLength={200}
              required
            />
            <p className="text-sm text-yellow-200/70 mt-1 font-semibold" style={{fontFamily: "'Cinzel', serif"}}>
              Bądź precyzyjny i jasny co do kryteriów predykcji. ({formData.description.length}/200)
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Czas Rozpoczęcia</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="datetime-local"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  className="input pl-10"
                  lang="en-US"
                  data-locale="en-US"
                  style={{ 
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                  }}
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">Czas Zakończenia</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="datetime-local"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  className="input pl-10"
                  lang="en-US"
                  data-locale="en-US"
                  style={{ 
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                  }}
                  required
                />
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Początkowa Cena Tak (ETH)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  name="yesPrice"
                  value={formData.yesPrice}
                  onChange={handleInputChange}
                  step="0.00001"
                  min="0.0001"
                  className="input pl-10"
                  placeholder="0.001"
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">Początkowa Cena Nie (ETH)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  name="noPrice"
                  value={formData.noPrice}
                  onChange={handleInputChange}
                  step="0.00001"
                  min="0.0001"
                  className="input pl-10"
                  placeholder="0.001"
                  required
                />
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-200 mb-1" style={{fontFamily: "'Cinzel', serif"}}>Funkcje Prywatności</h4>
                <ul className="text-sm text-yellow-100/80 space-y-1 font-semibold" style={{fontFamily: "'Cinzel', serif"}}>
                  <li>✨ Kwoty zakładów są szyfrowane przy użyciu Zama FHE</li>
                  <li>✨ Kierunki zakładów (TAK/NIE) pozostają prywatne</li>
                  <li>✨ Tylko ostateczne wyniki są publicznie ujawniane</li>
                </ul>
              </div>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary w-full flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="loading-spinner" />
                <span>Creating Event...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Stwórz Wydarzenie</span>
              </>
            )}
          </button>
        </form>
      </div>
      
      <div className="mt-8 text-center text-white/60 text-sm">
        <p>Event creation requires owner permissions. Make sure you're connected with the correct wallet.</p>
        <p className="mt-1">Contract Address: {DEFAULT_CONTRACT_ADDRESS}</p>
      </div>
    </div>
  );
};

export default CreateEvent;