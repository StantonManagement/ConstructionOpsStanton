const STORAGE_KEY_PREFIX = 'recent_';
const MAX_RECENT = 3;

interface RecentItem {
  id: string;
  name: string;
  href: string;
  timestamp: number;
}

export function getRecentItems(type: 'projects' | 'contractors' | 'components'): RecentItem[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${type}`);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function addRecentItem(
  type: 'projects' | 'contractors' | 'components',
  item: { id: string; name: string; href: string }
): void {
  if (typeof window === 'undefined') return;
  const existing = getRecentItems(type);
  
  const filtered = existing.filter(i => i.id !== item.id);
  
  const updated = [
    { ...item, timestamp: Date.now() },
    ...filtered
  ].slice(0, MAX_RECENT);
  
  localStorage.setItem(`${STORAGE_KEY_PREFIX}${type}`, JSON.stringify(updated));
}

export function clearRecentItems(type: 'projects' | 'contractors' | 'components'): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${STORAGE_KEY_PREFIX}${type}`);
}
