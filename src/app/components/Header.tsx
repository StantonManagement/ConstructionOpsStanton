import React, { useState, useEffect } from 'react';
import { Clock, User, LogOut, Menu, X } from 'lucide-react';

interface HeaderProps {
  onShowProfile: () => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ onShowProfile, onLogout }) => {
  const [time, setTime] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime(); // Set initial time
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">COC</span>
            </div>
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              <span className="hidden sm:inline">Construction Ops - Stanton</span>
              <span className="sm:hidden">COC - Stanton</span>
            </h1>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <div className="text-sm text-gray-600 flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              <span className="hidden lg:inline">Last updated: </span>
              {time}
            </div>
            <button
              className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
              title="Profile"
              onClick={onShowProfile}
            >
              <User className="w-4 h-4 text-gray-600" />
            </button>
            <button
              className="bg-red-500 text-white px-3 py-1.5 rounded text-sm hover:bg-red-600 transition-colors"
              onClick={onLogout}
            >
              Logout
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="py-3 space-y-3">
              <div className="flex items-center justify-center text-sm text-gray-600">
                <Clock className="w-4 h-4 mr-1" />
                Last updated: {time}
              </div>
              <div className="flex flex-col space-y-2 px-4">
                <button
                  className="flex items-center justify-center gap-2 py-2 px-4 text-gray-700 hover:bg-gray-50 rounded"
                  onClick={() => {
                    onShowProfile();
                    setIsMenuOpen(false);
                  }}
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button
                  className="flex items-center justify-center gap-2 bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition-colors"
                  onClick={() => {
                    onLogout();
                    setIsMenuOpen(false);
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;