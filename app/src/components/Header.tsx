import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Shield, Zap, AlertCircle } from 'lucide-react';
import { useFHE } from '@/utils/fhe';

const Header: React.FC = () => {
  const { isInitialized, isInitializing, error, initialize } = useFHE();
  
  const handleInitializeFHE = async () => {
    try {
      await initialize();
    } catch (err) {
      console.error('Failed to initialize FHE:', err);
    }
  };
  
  return (
    <header className="bg-gradient-to-r from-purple-900/50 via-pink-900/40 to-indigo-900/50 backdrop-blur-xl border-b-2 border-yellow-400/40 sticky top-0 z-50 shadow-2xl">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 relative">
              <Shield className="w-10 h-10 text-yellow-400 animate-pulse drop-shadow-lg" style={{filter: 'drop-shadow(0 0 10px rgba(255,215,0,0.8))'}} />
              <Zap className="w-8 h-8 text-yellow-300 animate-bounce" style={{filter: 'drop-shadow(0 0 8px rgba(255,215,0,0.6))'}} />
            </div>
            <div>
              <h1 className="text-3xl font-bold magic-text" style={{fontFamily: "'Uncial Antiqua', cursive"}}>polybets by winorlos9idk</h1>
              <p className="text-sm text-yellow-200 font-semibold" style={{fontFamily: "'Cinzel', serif"}}>Magiczny Rynek Predykcji</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 text-sm">
              <div className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-purple-800/40 border border-yellow-400/30">
                {error ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-400 animate-pulse" />
                    <span className="text-red-300 font-bold" style={{fontFamily: "'Cinzel', serif"}}>Błąd FHE</span>
                  </>
                ) : isInitialized ? (
                  <>
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                    <span className="text-green-300 font-bold" style={{fontFamily: "'Cinzel', serif"}}>FHE Gotowe</span>
                  </>
                ) : isInitializing ? (
                  <>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse shadow-lg shadow-yellow-400/50"></div>
                    <span className="text-yellow-300 font-bold" style={{fontFamily: "'Cinzel', serif"}}>Ładowanie...</span>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span className="text-gray-300 font-bold" style={{fontFamily: "'Cinzel', serif"}}>FHE Nie Gotowe</span>
                  </>
                )}
              </div>
              
              {!isInitialized && !isInitializing && (
                <button
                  onClick={handleInitializeFHE}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-400 hover:from-yellow-400 hover:to-amber-300 text-purple-900 text-sm font-bold transition-all transform hover:scale-105 shadow-lg shadow-yellow-500/50"
                  style={{fontFamily: "'Cinzel', serif"}}
                >
                  Aktywuj FHE
                </button>
              )}
              
              {error && !isInitializing && (
                <button
                  onClick={handleInitializeFHE}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white text-sm font-bold transition-all transform hover:scale-105 shadow-lg shadow-red-500/50"
                  style={{fontFamily: "'Cinzel', serif"}}
                >
                  Spróbuj Ponownie
                </button>
              )}
            </div>
            
            <ConnectButton 
              showBalance={false}
              chainStatus="icon"
              accountStatus={{
                smallScreen: 'avatar',
                largeScreen: 'full',
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;