'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { getRecentItems } from '@/lib/recentItems';

interface RecentItem {
  id: string;
  name: string;
  href: string;
}

interface Props {
  icon: React.ReactNode;
  label: string;
  href: string;
  type: 'projects' | 'contractors' | 'components';
}

export function CollapsibleNavItem({ icon, label, href, type }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  
  const isActive = pathname.startsWith(href);

  useEffect(() => {
    setMounted(true);
  }, []);

  const recentItems = mounted ? getRecentItems(type) : [];
  const hasRecent = recentItems.length > 0;

  return (
    <div>
      <div className="flex items-center">
        <button
          onClick={() => router.push(href)}
          className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
            isActive ? 'bg-accent font-medium' : 'hover:bg-accent/50'
          }`}
        >
          {icon}
          <span>{label}</span>
        </button>
        {hasRecent && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-2 hover:bg-accent/50 rounded"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        )}
      </div>
      
      {expanded && hasRecent && (
        <div className="ml-9 mt-1 space-y-0.5 border-l-2 border-gray-100 pl-2">
          {recentItems.map(item => (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className="block w-full text-left px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded truncate"
              title={item.name}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
