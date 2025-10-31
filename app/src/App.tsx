import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { config } from './wagmi';
import Header from './components/Header';
import EventList from './components/EventList';
import CreateEvent from './components/CreateEvent';
import MyBets from './components/MyBets';
import ErrorBoundary from './components/ErrorBoundary';

const queryClient = new QueryClient();

function App() {
  const [activeTab, setActiveTab] = useState<'events' | 'create' | 'mybets'>('events');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <ErrorBoundary>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            <div className="min-h-screen relative z-10">
              <Header />
              
              <main className="container mx-auto px-4 py-8 relative z-10">
                <div className="max-w-6xl mx-auto">
                  <div className="text-center mb-12">
                    <h1 className="magic-text text-6xl font-bold mb-6" style={{fontFamily: "'Uncial Antiqua', cursive"}}>
                      polybets by winorlos9idk
                    </h1>
                    <p className="text-yellow-200 text-xl mb-8 font-semibold" style={{fontFamily: "'Cinzel', serif", textShadow: '0 0 10px rgba(255,215,0,0.5)'}}>
                      Magiczny Rynek Predykcji
                    </p>
                    
                    <div className="flex flex-col md:flex-row justify-center items-center gap-6 mb-4">
                      <button
                        onClick={() => setActiveTab('events')}
                        className={`btn px-8 py-4 text-lg ${
                          activeTab === 'events' ? 'btn-primary' : 'btn-secondary'
                        }`}
                        style={{order: 2}}
                      >
                        Wydarzenia
                      </button>
                      <button
                        onClick={() => setActiveTab('create')}
                        className={`btn px-8 py-4 text-lg ${
                          activeTab === 'create' ? 'btn-primary' : 'btn-secondary'
                        }`}
                        style={{order: 1}}
                      >
                        Stwórz Wydarzenie
                      </button>
                      <button
                        onClick={() => setActiveTab('mybets')}
                        className={`btn px-8 py-4 text-lg ${
                          activeTab === 'mybets' ? 'btn-primary' : 'btn-secondary'
                        }`}
                        style={{order: 3}}
                      >
                        Moje Zakłady
                      </button>
                    </div>
                  </div>
                  
                  <div className="animate-fade-in">
                    {activeTab === 'events' ? (
                      <EventList refreshTrigger={refreshTrigger} />
                    ) : activeTab === 'mybets' ? (
                      <MyBets />
                    ) : (
                      <CreateEvent onEventCreated={() => {
                        setActiveTab('events');
                        setRefreshTrigger(prev => prev + 1); // Trigger refresh when new event is created
                      }} />
                    )}
                  </div>
                </div>
              </main>
              
              <footer className="bg-purple-900/30 backdrop-blur-lg border-t-2 border-yellow-400/30 mt-16 relative z-10">
                <div className="container mx-auto px-4 py-8">
                  <div className="text-center text-yellow-200 font-semibold" style={{fontFamily: "'Cinzel', serif"}}>
                    <p className="text-lg mb-2">✨ 2024 polybets by winorlos9idk ✨</p>
                    <p className="text-sm">
                      Zasilane przez magiczną technologię Zama FHE
                    </p>
                  </div>
                </div>
              </footer>
            </div>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  );
}

export default App;