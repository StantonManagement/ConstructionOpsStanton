import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const Header: React.FC = () => {
  const [time, setTime] = useState<string>("");

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
            <h1 className="text-xl font-semibold text-gray-900">Construction Operations Center</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              <Clock className="w-4 h-4 inline mr-1" />
              Last updated: {time}
            </div>
            <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header; 