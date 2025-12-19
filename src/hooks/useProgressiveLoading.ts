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
  const loadedTabsRef = useRef<Set<string>>(loadedTabs);

  useEffect(() => {
    loadedTabsRef.current = loadedTabs;
  }, [loadedTabs]);

  // Load active tab immediately
  useEffect(() => {
    const timers = tabLoadTimers.current;

    if (!loadedTabsRef.current.has(activeTab)) {
      queueMicrotask(() => setLoadingTab(activeTab));

      const timer = setTimeout(() => {
        setLoadedTabs(prev => new Set([...prev, activeTab]));
        setLoadingTab(null);
      }, delay);

      timers.set(activeTab, timer);
    }

    return () => {
      const timer = timers.get(activeTab);
      if (timer) {
        clearTimeout(timer);
        timers.delete(activeTab);
      }
    };
  }, [activeTab, delay]);

  // Preload adjacent tabs after initial load
  useEffect(() => {
    const timers = tabLoadTimers.current;

    if (enabledTabs.length === 0) return;

    const currentIndex = enabledTabs.indexOf(activeTab);
    if (currentIndex === -1) return;

    // Preload next and previous tabs
    const tabsToPreload = [
      enabledTabs[currentIndex - 1],
      enabledTabs[currentIndex + 1]
    ].filter(Boolean);

    tabsToPreload.forEach((tab, index) => {
      if (!loadedTabsRef.current.has(tab) && !timers.has(tab)) {
        const preloadDelay = delay + (index + 1) * staggerDelay;
        const timer = setTimeout(() => {
          setLoadedTabs(prev => new Set([...prev, tab]));
          timers.delete(tab);
        }, preloadDelay);

        timers.set(tab, timer);
      }
    });
  }, [activeTab, enabledTabs, delay, staggerDelay]);

  // Cleanup on unmount
  useEffect(() => {
    const timers = tabLoadTimers.current;

    return () => {
      timers.forEach(timer => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return {
    isTabLoaded: (tab: string) => loadedTabs.has(tab),
    isTabLoading: (tab: string) => loadingTab === tab,
    loadedTabs: Array.from(loadedTabs),
    preloadTab: (tab: string) => {
      const timers = tabLoadTimers.current;

      if (!loadedTabsRef.current.has(tab) && !timers.has(tab)) {
        const timer = setTimeout(() => {
          setLoadedTabs(prev => new Set([...prev, tab]));
          timers.delete(tab);
        }, delay);
        timers.set(tab, timer);
      }
    }
  };
}