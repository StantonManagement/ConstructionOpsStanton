'use client';

import { useState, useEffect, useRef } from 'react';

interface ProgressiveLoadingOptions {
  delay?: number;
  staggerDelay?: number;
  enabledTabs?: string[];
}

export function useProgressiveLoading(
  activeTab: string,
  options: ProgressiveLoadingOptions = {}
) {
  const { delay = 100, staggerDelay = 50, enabledTabs = [] } = options;
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['overview']));
  const [loadingTab, setLoadingTab] = useState<string | null>(null);
  const tabLoadTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Load active tab immediately
  useEffect(() => {
    if (!loadedTabs.has(activeTab)) {
      setLoadingTab(activeTab);

      const timer = setTimeout(() => {
        setLoadedTabs(prev => new Set([...prev, activeTab]));
        setLoadingTab(null);
      }, delay);

      tabLoadTimers.current.set(activeTab, timer);
    }

    return () => {
      const timer = tabLoadTimers.current.get(activeTab);
      if (timer) {
        clearTimeout(timer);
        tabLoadTimers.current.delete(activeTab);
      }
    };
  }, [activeTab, delay, loadedTabs]);

  // Preload adjacent tabs after initial load
  useEffect(() => {
    if (enabledTabs.length === 0) return;

    const currentIndex = enabledTabs.indexOf(activeTab);
    if (currentIndex === -1) return;

    // Preload next and previous tabs
    const tabsToPreload = [
      enabledTabs[currentIndex - 1],
      enabledTabs[currentIndex + 1]
    ].filter(Boolean);

    tabsToPreload.forEach((tab, index) => {
      if (!loadedTabs.has(tab) && !tabLoadTimers.current.has(tab)) {
        const preloadDelay = delay + (index + 1) * staggerDelay;
        const timer = setTimeout(() => {
          setLoadedTabs(prev => new Set([...prev, tab]));
          tabLoadTimers.current.delete(tab);
        }, preloadDelay);

        tabLoadTimers.current.set(tab, timer);
      }
    });
  }, [activeTab, enabledTabs, delay, staggerDelay, loadedTabs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      tabLoadTimers.current.forEach(timer => clearTimeout(timer));
      tabLoadTimers.current.clear();
    };
  }, []);

  return {
    isTabLoaded: (tab: string) => loadedTabs.has(tab),
    isTabLoading: (tab: string) => loadingTab === tab,
    loadedTabs: Array.from(loadedTabs),
    preloadTab: (tab: string) => {
      if (!loadedTabs.has(tab) && !tabLoadTimers.current.has(tab)) {
        const timer = setTimeout(() => {
          setLoadedTabs(prev => new Set([...prev, tab]));
          tabLoadTimers.current.delete(tab);
        }, delay);
        tabLoadTimers.current.set(tab, timer);
      }
    }
  };
}