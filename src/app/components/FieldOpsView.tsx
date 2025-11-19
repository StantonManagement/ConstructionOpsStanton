'use client';

import React, { useState } from 'react';
import PunchListView from './PunchListView';

/**
 * FieldOpsView - Main container for field operations features
 * Includes: Punch List, Photos, Warranties
 */
export default function FieldOpsView() {
  const [activeSubTab, setActiveSubTab] = useState<'punch-list' | 'photos' | 'warranties'>('punch-list');

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="bg-white rounded-lg shadow-sm p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab('punch-list')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeSubTab === 'punch-list'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            📋 Punch List
          </button>
          <button
            onClick={() => setActiveSubTab('photos')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeSubTab === 'photos'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            📸 Photos
          </button>
          <button
            onClick={() => setActiveSubTab('warranties')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeSubTab === 'warranties'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            🛡️ Warranties
          </button>
        </div>
      </div>

      {/* Content */}
      <div>
        {activeSubTab === 'punch-list' && <PunchListView />}
        
        {activeSubTab === 'photos' && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Photo Gallery</h3>
            <p className="text-gray-600">
              Photo management system coming soon. This will include:
            </p>
            <ul className="mt-4 text-left max-w-md mx-auto space-y-2 text-gray-700">
              <li>• Camera capture with GPS tagging</li>
              <li>• Photo gallery with filtering</li>
              <li>• Before/after comparison</li>
              <li>• Photo annotations</li>
              <li>• Link photos to punch items and projects</li>
            </ul>
          </div>
        )}
        
        {activeSubTab === 'warranties' && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Warranty Tracking</h3>
            <p className="text-gray-600">
              Warranty management system coming soon. This will include:
            </p>
            <ul className="mt-4 text-left max-w-md mx-auto space-y-2 text-gray-700">
              <li>• Track warranties by project and contractor</li>
              <li>• Expiration reminders (30/60/90 days)</li>
              <li>• File warranty claims</li>
              <li>• Upload warranty documents</li>
              <li>• Claims tracking and resolution</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

