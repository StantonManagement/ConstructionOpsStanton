import React from 'react';
import { ChevronRight } from 'lucide-react';

interface NavSectionProps {
  title: string;
  icon?: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  isActive?: boolean;
  disabled?: boolean;
}

const NavSection: React.FC<NavSectionProps> = ({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
  isActive = false,
  disabled = false
}) => {
  return (
    <div className="space-y-1">
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`
          w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent hover:text-accent-foreground'}
          ${isActive ? 'text-primary' : 'text-muted-foreground'}
        `}
      >
        <span className="flex-shrink-0">
          {icon}
        </span>
        <span className="ml-3 flex-1 text-left truncate">{title}</span>
        {!disabled && (
          <ChevronRight
            className={`w-4 h-4 transition-transform duration-200 ${
              isExpanded ? 'transform rotate-90' : ''
            }`}
          />
        )}
      </button>
      
      <div
        className={`
          overflow-hidden transition-all duration-200 ease-in-out
          ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="pl-4 space-y-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default NavSection;




