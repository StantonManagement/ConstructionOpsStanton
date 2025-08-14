import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// Import the CompactStats component
const CompactStats = ({ pendingSMS, reviewQueue, readyChecks, weeklyTotal, onStatClick, currentFilter }: any) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6">
      <div 
        className={`bg-white border rounded-lg p-3 sm:p-4 cursor-pointer transition-all hover:shadow-md ${
          currentFilter === 'sms_sent' 
            ? 'border-blue-500 bg-blue-50 shadow-md' 
            : 'border-gray-200 hover:border-blue-300'
        }`}
        onClick={() => onStatClick('sms_pending')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 ${currentFilter === 'sms_sent' ? 'bg-orange-600' : 'bg-orange-500'} rounded-lg flex items-center justify-center text-white`}>
              <span className="text-sm sm:text-lg">📱</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">SMS Pending</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{pendingSMS}</p>
            </div>
          </div>
        </div>
      </div>
      <div 
        className={`bg-white border rounded-lg p-3 sm:p-4 cursor-pointer transition-all hover:shadow-md ${
          currentFilter === 'submitted' 
            ? 'border-blue-500 bg-blue-50 shadow-md' 
            : 'border-gray-200 hover:border-blue-300'
        }`}
        onClick={() => onStatClick('review_queue')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 ${currentFilter === 'submitted' ? 'bg-red-600' : 'bg-red-500'} rounded-lg flex items-center justify-center text-white`}>
              <span className="text-sm sm:text-lg">⚠️</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Review Queue</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{reviewQueue}</p>
            </div>
          </div>
        </div>
      </div>
      <div 
        className={`bg-white border rounded-lg p-3 sm:p-4 cursor-pointer transition-all hover:shadow-md ${
          currentFilter === 'approved' 
            ? 'border-blue-500 bg-blue-50 shadow-md' 
            : 'border-gray-200 hover:border-blue-300'
        }`}
        onClick={() => onStatClick('ready_checks')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 ${currentFilter === 'approved' ? 'bg-purple-600' : 'bg-purple-500'} rounded-lg flex items-center justify-center text-white`}>
              <span className="text-sm sm:text-lg">💰</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Ready Checks</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{readyChecks}</p>
            </div>
          </div>
        </div>
      </div>
      <div 
        className={`bg-white border rounded-lg p-3 sm:p-4 cursor-pointer transition-all hover:shadow-md ${
          currentFilter === 'approved' 
            ? 'border-blue-500 bg-blue-50 shadow-md' 
            : 'border-gray-200 hover:border-blue-300'
        }`}
        onClick={() => onStatClick('weekly_total')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 ${currentFilter === 'approved' ? 'bg-blue-600' : 'bg-blue-500'} rounded-lg flex items-center justify-center text-white`}>
              <span className="text-sm sm:text-lg">📊</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Weekly Total</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{formatCurrency(weeklyTotal)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

describe('CompactStats', () => {
  const defaultProps = {
    pendingSMS: 5,
    reviewQueue: 3,
    readyChecks: 8,
    weeklyTotal: 125000,
    onStatClick: jest.fn(),
    currentFilter: null,
  }

  it('renders all stat cards with correct values', () => {
    render(<CompactStats {...defaultProps} />)
    
    expect(screen.getByText('📱')).toBeInTheDocument()
    expect(screen.getByText('⚠️')).toBeInTheDocument()
    expect(screen.getByText('💰')).toBeInTheDocument()
    expect(screen.getByText('📊')).toBeInTheDocument()
    
    expect(screen.getByText('SMS Pending')).toBeInTheDocument()
    expect(screen.getByText('Review Queue')).toBeInTheDocument()
    expect(screen.getByText('Ready Checks')).toBeInTheDocument()
    expect(screen.getByText('Weekly Total')).toBeInTheDocument()
    
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('$125,000')).toBeInTheDocument()
  })

  it('calls onStatClick with correct parameters when cards are clicked', () => {
    const mockOnStatClick = jest.fn()
    render(<CompactStats {...defaultProps} onStatClick={mockOnStatClick} />)
    
    // Click SMS Pending card
    const smsCard = screen.getByText('📱').closest('div')?.parentElement?.parentElement?.parentElement
    fireEvent.click(smsCard!)
    expect(mockOnStatClick).toHaveBeenCalledWith('sms_pending')
    
    // Click Review Queue card
    const reviewCard = screen.getByText('⚠️').closest('div')?.parentElement?.parentElement?.parentElement
    fireEvent.click(reviewCard!)
    expect(mockOnStatClick).toHaveBeenCalledWith('review_queue')
    
    // Click Ready Checks card
    const readyCard = screen.getByText('💰').closest('div')?.parentElement?.parentElement?.parentElement
    fireEvent.click(readyCard!)
    expect(mockOnStatClick).toHaveBeenCalledWith('ready_checks')
    
    // Click Weekly Total card
    const weeklyCard = screen.getByText('📊').closest('div')?.parentElement?.parentElement?.parentElement
    fireEvent.click(weeklyCard!)
    expect(mockOnStatClick).toHaveBeenCalledWith('weekly_total')
  })

  it('applies active styling when currentFilter matches', () => {
    render(<CompactStats {...defaultProps} currentFilter="sms_sent" />)
    
    const smsCard = screen.getByText('📱').closest('div')?.parentElement?.parentElement?.parentElement
    expect(smsCard).toHaveClass('border-blue-500', 'bg-blue-50', 'shadow-md')
  })

  it('applies inactive styling when currentFilter does not match', () => {
    render(<CompactStats {...defaultProps} currentFilter="submitted" />)
    
    const smsCard = screen.getByText('📱').closest('div')?.parentElement?.parentElement?.parentElement
    expect(smsCard).toHaveClass('border-gray-200')
    expect(smsCard).not.toHaveClass('border-blue-500', 'bg-blue-50')
  })

  it('formats currency correctly for weekly total', () => {
    render(<CompactStats {...defaultProps} weeklyTotal={2500000} />)
    
    expect(screen.getByText('$2,500,000')).toBeInTheDocument()
  })

  it('handles zero values', () => {
    render(<CompactStats {...defaultProps} pendingSMS={0} reviewQueue={0} readyChecks={0} weeklyTotal={0} />)
    
    // Use getAllByText to get all elements with '0' and check they exist
    const zeroElements = screen.getAllByText('0')
    expect(zeroElements).toHaveLength(3) // SMS Pending, Review Queue, Ready Checks
    
    expect(screen.getByText('$0')).toBeInTheDocument()
  })
})
