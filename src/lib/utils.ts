export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatTimeRemaining(endTime: string): string {
  const end = new Date(endTime).getTime();
  const now = Date.now();
  const diff = end - now;

  if (diff <= 0) return 'Ended';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function isAuctionActive(endTime: string, status: string): boolean {
  if (status !== 'active') return false;
  return new Date(endTime).getTime() > Date.now();
}

export function isAuctionEndingSoon(endTime: string): boolean {
  const diff = new Date(endTime).getTime() - Date.now();
  return diff > 0 && diff < 60 * 60 * 1000; // less than 1 hour
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const CATEGORIES = [
  'Electronics',
  'Art & Collectibles',
  'Jewelry & Watches',
  'Fashion & Apparel',
  'Home & Garden',
  'Sports Memorabilia',
  'Books & Media',
  'Toys & Games',
  'Automotive',
  'General',
] as const;
