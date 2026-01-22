'use client';

import React, { useState } from 'react';

export function TestModal() {
  // START WITH TRUE - MODAL SHOWS IMMEDIATELY
  const [isOpen, setIsOpen] = useState(true);

  console.log('🎯🎯🎯 TEST MODAL COMPONENT IS RENDERING! isOpen:', isOpen);

  return (
    <div>
      <div className="p-4 bg-green-200 border-4 border-green-600 rounded">
        <p className="font-bold text-lg">✅ TEST MODAL COMPONENT IS LOADED</p>
        <button
          onClick={() => {
            console.log('🔥 TEST BUTTON CLICKED');
            setIsOpen(!isOpen);
            console.log('🔥 Toggled to:', !isOpen);
          }}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
        >
          {isOpen ? 'HIDE' : 'SHOW'} MODAL
        </button>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 bg-red-500 bg-opacity-90 flex items-center justify-center"
          style={{ zIndex: 99999 }}
          onClick={() => setIsOpen(false)}
        >
          {console.log('✅✅✅ MODAL IS ACTUALLY VISIBLE ON SCREEN!')}
          <div
            className="bg-white p-12 rounded-lg shadow-2xl border-8 border-yellow-400"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-4xl font-bold mb-4 text-green-600">🎉 IT WORKS!</h2>
            <p className="text-xl">If you see this giant modal, React state updates ARE working!</p>
            <button
              onClick={() => setIsOpen(false)}
              className="mt-6 px-6 py-3 bg-red-500 text-white rounded text-xl font-bold"
            >
              CLOSE MODAL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
