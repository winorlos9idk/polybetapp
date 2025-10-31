import { formatDistanceToNow, format } from 'date-fns';
import { ERROR_MESSAGES } from '@/constants/config';
import { EventStatus } from '@/type';

export const formatEther = (value: bigint, decimals: number = 4): string => {
  const eth = Number(value) / 1e18;
  return eth.toFixed(decimals);
};

export const parseEther = (value: string): bigint => {
  const num = parseFloat(value);
  return BigInt(Math.floor(num * 1e18));
};

export const formatTimestamp = (timestamp: number): string => {
  return format(new Date(timestamp * 1000), 'MMM dd, yyyy HH:mm');
};

export const formatTimeRemaining = (timestamp: number): string => {
  const now = Date.now();
  const targetTime = timestamp * 1000;

  if (targetTime <= now) {
    return 'Ended';
  }

  return `Ends ${formatDistanceToNow(new Date(targetTime), { addSuffix: true })}`;
};

export const getEventStatus = (
  startTime: number,
  endTime: number,
  isResolved: boolean
): EventStatus => {
  const now = Math.floor(Date.now() / 1000);

  if (isResolved) return EventStatus.RESOLVED;
  if (now < startTime) return EventStatus.UPCOMING;
  if (now >= startTime && now <= endTime) return EventStatus.ACTIVE;
  return EventStatus.ENDED;
};

export const isEventActive = (
  startTime: number,
  endTime: number,
  isResolved: boolean
): boolean => {
  const status = getEventStatus(startTime, endTime, isResolved);
  return status === EventStatus.ACTIVE;
};

export const getStatusColor = (status: EventStatus): string => {
  switch (status) {
    case EventStatus.UPCOMING:
      return 'text-blue-500';
    case EventStatus.ACTIVE:
      return 'text-green-500';
    case EventStatus.ENDED:
      return 'text-yellow-500';
    case EventStatus.RESOLVED:
      return 'text-gray-500';
    default:
      return 'text-gray-500';
  }
};

export const getStatusBadgeColor = (status: EventStatus): string => {
  switch (status) {
    case EventStatus.UPCOMING:
      return 'bg-blue-100 text-blue-800';
    case EventStatus.ACTIVE:
      return 'bg-green-100 text-green-800';
    case EventStatus.ENDED:
      return 'bg-yellow-100 text-yellow-800';
    case EventStatus.RESOLVED:
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const calculateOdds = (yesShares: number, noShares: number): { yes: number; no: number } => {
  const total = yesShares + noShares;

  if (total === 0) {
    return { yes: 50, no: 50 };
  }

  return {
    yes: Math.round((yesShares / total) * 100),
    no: Math.round((noShares / total) * 100)
  };
};

export const calculatePotentialWinnings = (
  _betAmount: number,
  userShares: number,
  totalWinningShares: number,
  totalPool: number
): number => {
  if (totalWinningShares === 0) return 0;

  return (totalPool * userShares) / totalWinningShares;
};

export const shortenAddress = (address: string, chars: number = 4): string => {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

export const validateBetAmount = (amount: string, maxAmount: number = 10): string | null => {
  const num = parseFloat(amount);

  if (isNaN(num) || num <= 0) {
    return 'Please enter a valid amount';
  }

  if (num < 0.0001) {
    return 'Minimum bet amount is 0.0001 ETH';
  }

  if (num > maxAmount) {
    return `Maximum bet amount is ${maxAmount} ETH`;
  }

  return null;
};

export const validateShares = (shares: string): string | null => {
  const num = parseInt(shares);

  if (isNaN(num) || num <= 0) {
    return 'Please enter a valid number of shares';
  }

  if (num > 1000) {
    return 'Maximum 1000 shares allowed';
  }

  return null;
};

export const validateEventDates = (startTime: string, endTime: string): string | null => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const now = new Date();

  if (start <= now) {
    return 'Start time must be in the future';
  }

  if (end <= start) {
    return 'End time must be after start time';
  }

  const minDuration = 5 * 60 * 1000; // 5 minutes
  if (end.getTime() - start.getTime() < minDuration) {
    return 'Event must last at least 5 minutes';
  }

  return null;
};

export const getErrorMessage = (errorCode: number): string => {
  return ERROR_MESSAGES[errorCode as keyof typeof ERROR_MESSAGES] || 'Unknown error';
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};

export const formatLargeNumber = (num: number): string => {
  if (num >= 1e9) {
    return `${(num / 1e9).toFixed(1)}B`;
  }
  if (num >= 1e6) {
    return `${(num / 1e6).toFixed(1)}M`;
  }
  if (num >= 1e3) {
    return `${(num / 1e3).toFixed(1)}K`;
  }
  return num.toString();
};