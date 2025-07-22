import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface HeaderProps {
  onShowProfile: () => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ onShowProfile, onLogout }) => {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    setTime(new Date().toLocaleTimeString());
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><span className="text-white font-bold text-sm">COC</span></div>
            <h1 className="text-xl font-semibold text-gray-900">Construction Ops - Stanton</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              <Clock className="w-4 h-4 inline mr-1" />
              {time ? <>Last updated: {time}</> : null}
            </div>
            <button
              className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center hover:bg-gray-400 focus:outline-none"
              title="Profile"
              onClick={onShowProfile}
            >
              <span className="text-gray-700 font-bold">👤</span>
            </button>
            <button
              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
              onClick={onLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header; 