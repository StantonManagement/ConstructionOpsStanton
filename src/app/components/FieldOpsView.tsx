'use client';

import React, { useState } from 'react';
import PhotoGalleryView from './PhotoGalleryView';
import ScheduleView from './schedule/ScheduleView';
import WarrantiesList from './warranties/WarrantiesList';

/**
 * FieldOpsView - Main container for field operations features
 * Includes: Photos, Warranties, Schedule
 * Note: Punch Lists moved to project-specific view (Projects > Project Detail > Punch Lists tab)
 */
export default function FieldOpsView() {
  const [activeSubTab, setActiveSubTab] = useState<'schedule' | 'photos' | 'warranties'>('schedule');

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="bg-white rounded-lg shadow-sm p-2">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('schedule')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeSubTab === 'schedule'
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            📅 Schedule
          </button>
          <button
            onClick={() => setActiveSubTab('photos')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeSubTab === 'photos'
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            📸 Photos
          </button>
          <button
            onClick={() => setActiveSubTab('warranties')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeSubTab === 'warranties'
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            🛡️ Warranties
          </button>
        </div>
      </div>

      {/* Content */}
      <div>
        {activeSubTab === 'schedule' && <ScheduleView />}

        {activeSubTab === 'photos' && <PhotoGalleryView />}
        
        {activeSubTab === 'warranties' && <WarrantiesList />}
      </div>
    </div>
  );
}
