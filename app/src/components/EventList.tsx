import React, { useState } from 'react';
import { Calendar, Clock, TrendingUp, Users, RefreshCw, AlertTriangle } from 'lucide-react';
import { useEvents, PredictionEvent } from '@/hooks/useEvents';
import EventCard from './EventCard';
import BetModal from './BetModal';
import ResolveModal from './ResolveModal';

interface EventListProps {
  refreshTrigger?: number;
}

const EventList: React.FC<EventListProps> = ({ refreshTrigger }) => {
  const { events, isLoading, error, refetch } = useEvents();
  const [selectedEvent, setSelectedEvent] = useState<PredictionEvent | null>(null);
  const [isBetModalOpen, setIsBetModalOpen] = useState(false);
  const [selectedResolveEvent, setSelectedResolveEvent] = useState<PredictionEvent | null>(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);

  // Refresh when trigger changes
  React.useEffect(() => {
    if (refreshTrigger) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  const handleBet = (eventId: number) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      setSelectedEvent(event);
      setIsBetModalOpen(true);
    }
  };

  const handleBetModalClose = () => {
    setIsBetModalOpen(false);
    setSelectedEvent(null);
  };

  const handleBetSuccess = () => {
    // Refresh events list after successful bet
    refetch();
  };

  const handleResolve = (eventId: number) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      setSelectedResolveEvent(event);
      setIsResolveModalOpen(true);
    }
  };

  const handleResolveModalClose = () => {
    setIsResolveModalOpen(false);
    setSelectedResolveEvent(null);
  };

  const handleResolveSuccess = () => {
    // Refresh events list after successful resolution
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center space-x-4 mb-4">
          <h2 className="magic-text text-4xl font-bold" style={{fontFamily: "'Cinzel', serif"}}>Wydarzenia</h2>
          <button
            onClick={refetch}
            disabled={isLoading}
            className="btn btn-secondary text-sm px-4 py-2 flex items-center space-x-2"
            style={{order: 1}}
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Odśwież</span>
          </button>
        </div>
        <p className="text-yellow-200 text-lg font-semibold" style={{fontFamily: "'Cinzel', serif", textShadow: '0 0 10px rgba(255,215,0,0.5)'}}>
          Umieść zaszyfrowane zakłady na nadchodzące wydarzenia. Twoje przewidywania pozostają prywatne do rozstrzygnięcia.
        </p>
      </div>
      
      {/* Loading state */}
      {isLoading && (
        <div className="card text-center py-12">
          <div className="flex justify-center mb-4">
            <RefreshCw className="w-16 h-16 text-white/40 animate-spin" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Loading Events...</h3>
          <p className="text-white/60">
            Fetching the latest prediction events from the blockchain.
          </p>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="card text-center py-12">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="w-16 h-16 text-red-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Error Loading Events</h3>
          <p className="text-red-200 mb-6">{error}</p>
          <button
            onClick={refetch}
            className="btn btn-primary"
          >
            Try Again
          </button>
        </div>
      )}

      {/* No events state */}
      {!isLoading && !error && events.length === 0 && (
        <div className="card text-center py-12">
          <div className="flex justify-center mb-4">
            <TrendingUp className="w-16 h-16 text-white/40" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Events Available</h3>
          <p className="text-white/60 mb-6">
            There are no prediction events at the moment. Check back later or create your own event!
          </p>
          <div className="flex justify-center space-x-4 text-sm text-white/50">
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>0 Active Bettors</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>0 Active Events</span>
            </div>
          </div>
        </div>
      )}

      {/* Events grid */}
      {!isLoading && !error && events.length > 0 && (
        <div className="grid md:grid-cols-3 gap-4">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onBet={handleBet}
              onResolve={handleResolve}
            />
          ))}
        </div>
      )}

      {/* Stats summary */}
      {!isLoading && !error && events.length > 0 && (
        <div className="card">
          <h4 className="text-lg font-semibold text-white mb-4">Event Statistics</h4>
          <div className="grid md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{events.length}</div>
              <div className="text-sm text-white/60">Total Events</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">
                {events.filter(e => !e.resolved && e.startTime <= Date.now() / 1000 && e.endTime >= Date.now() / 1000).length}
              </div>
              <div className="text-sm text-white/60">Active Events</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">
                {events.filter(e => e.resolved).length}
              </div>
              <div className="text-sm text-white/60">Resolved Events</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Features info - only show when no events are available */}
      {!isLoading && !error && events.length === 0 && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="card text-center">
            <Calendar className="w-8 h-8 text-blue-400 mx-auto mb-3" />
            <h4 className="font-semibold text-white mb-2">Event Filtering</h4>
            <p className="text-white/60 text-sm">Filter events by status, category, and time</p>
          </div>
          <div className="card text-center">
            <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-3" />
            <h4 className="font-semibold text-white mb-2">Real-time Odds</h4>
            <p className="text-white/60 text-sm">Live odds calculation based on encrypted bets</p>
          </div>
          <div className="card text-center">
            <Users className="w-8 h-8 text-purple-400 mx-auto mb-3" />
            <h4 className="font-semibold text-white mb-2">Private Betting</h4>
            <p className="text-white/60 text-sm">Your bet amounts and directions stay encrypted</p>
          </div>
        </div>
      )}

      {/* Bet Modal */}
      <BetModal
        event={selectedEvent}
        isOpen={isBetModalOpen}
        onClose={handleBetModalClose}
        onBetSuccess={handleBetSuccess}
      />

      {/* Resolve Modal */}
      <ResolveModal
        event={selectedResolveEvent}
        isOpen={isResolveModalOpen}
        onClose={handleResolveModalClose}
        onResolveSuccess={handleResolveSuccess}
      />
    </div>
  );
};

export default EventList;