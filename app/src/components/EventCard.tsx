import React from 'react';
import { Calendar, Clock, Users, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import { formatEther } from 'viem';
import { PredictionEvent } from '@/hooks/useEvents';
import { getEventStatus, isEventActive } from '@/constants/config';
import { useOwner } from '@/hooks/useOwner';

interface EventCardProps {
  event: PredictionEvent;
  onBet?: (eventId: number) => void;
  onResolve?: (eventId: number) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onBet, onResolve }) => {
  const { isOwner } = useOwner();
  const status = getEventStatus(event.startTime, event.endTime, event.resolved);
  const canBet = isEventActive(event.startTime, event.endTime, event.resolved);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/10';
      case 'upcoming': return 'text-blue-400 bg-blue-400/10';
      case 'ended': return 'text-yellow-400 bg-yellow-400/10';
      case 'resolved': return 'text-purple-400 bg-purple-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Clock className="w-4 h-4" />;
      case 'upcoming': return <Calendar className="w-4 h-4" />;
      case 'ended': return <XCircle className="w-4 h-4" />;
      case 'resolved': return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="card hover:border-yellow-400/60 transition-all transform hover:scale-105 relative z-10">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-yellow-100 mb-3 line-clamp-2" style={{fontFamily: "'Cinzel', serif", textShadow: '0 0 8px rgba(255,215,0,0.6)'}}>
            {event.description}
          </h3>
          <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-bold ${getStatusColor(status)}`} style={{fontFamily: "'Cinzel', serif"}}>
            {getStatusIcon(status)}
            <span className="uppercase">{status === 'active' ? 'Aktywne' : status === 'upcoming' ? 'Nadchodzące' : status === 'ended' ? 'Zakończone' : 'Rozstrzygnięte'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="text-sm">
          <div className="flex items-center space-x-1 text-white/60 mb-1">
            <Calendar className="w-4 h-4" />
            <span>Start Time</span>
          </div>
          <div className="text-white">{formatDate(event.startTime)}</div>
        </div>
        <div className="text-sm">
          <div className="flex items-center space-x-1 text-white/60 mb-1">
            <Clock className="w-4 h-4" />
            <span>End Time</span>
          </div>
          <div className="text-white">{formatDate(event.endTime)}</div>
        </div>
      </div>

      {/* <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-sm">
          <div className="flex items-center space-x-1 text-white/60 mb-1">
            <span>YES Price</span>
          </div>
          <div className="text-white">{formatEther(event.priceYes)} ETH</div>
        </div>
        <div className="text-sm">
          <div className="flex items-center space-x-1 text-white/60 mb-1">
            <span>NO Price</span>
          </div>
          <div className="text-white">{formatEther(event.priceNo)} ETH</div>
        </div>
      </div> */}

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="text-sm">
          <div className="flex items-center space-x-1 text-white/60 mb-1">
            <span className={event.resolved && event.decryptionDone ? "text-green-400" : "text-yellow-400"}>
              {event.resolved && event.decryptionDone ? "🔓" : "🔒"}
            </span>
            <span>YES Total</span>
          </div>
          <div className={`font-semibold ${event.resolved && event.decryptionDone ? 'text-green-400' : 'text-yellow-400'}`}>
            {event.resolved && event.decryptionDone ? `${event.decryptedYes}` : "***"}
          </div>
        </div>
        <div className="text-sm">
          <div className="flex items-center space-x-1 text-white/60 mb-1">
            <span className={event.resolved && event.decryptionDone ? "text-green-400" : "text-yellow-400"}>
              {event.resolved && event.decryptionDone ? "🔓" : "🔒"}
            </span>
            <span>NO Total</span>
          </div>
          <div className={`font-semibold ${event.resolved && event.decryptionDone ? 'text-green-400' : 'text-yellow-400'}`}>
            {event.resolved && event.decryptionDone ? `${event.decryptedNo}` : "***"}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-white/60 mb-3">
        <div className="flex items-center space-x-1">
          <Users className="w-4 h-4" />
          <span>Total Pool: {formatEther(event.totalEth)} ETH</span>
        </div>
        <div className="flex items-center space-x-1">
          <TrendingUp className="w-4 h-4" />
          <span>Event #{event.id}</span>
        </div>
      </div>

      {event.resolved && (
        <div className="mb-3 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-purple-400" />
            <span className="text-purple-200 font-medium text-sm">
              Result: {event.outcome ? 'YES' : 'NO'} won
            </span>
          </div>
        </div>
      )}

      {canBet && onBet && (
        <button
          onClick={() => onBet(event.id)}
          className="btn btn-primary w-full mt-4 text-lg"
          style={{fontFamily: "'Cinzel', serif"}}
        >
          ✨ Postaw Zakład ✨
        </button>
      )}

      {status === 'upcoming' && (
        <div className="text-center text-white/60 text-sm">
          Betting opens {formatDate(event.startTime)}
        </div>
      )}

      {status === 'ended' && !event.resolved && (
        <div className="space-y-2">
          <div className="text-center text-yellow-200 text-sm">
            Waiting for reveal result...
          </div>
          {isOwner && onResolve && (
            <button
              onClick={() => onResolve(event.id)}
              className="btn btn-secondary w-full flex items-center justify-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Resolve Event</span>
            </button>
          )}
          {!isOwner && (
            <div className="text-center text-gray-400 text-xs">
              Only the contract owner can resolve events
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EventCard;