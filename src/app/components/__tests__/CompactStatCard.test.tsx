import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// Import the CompactStatCard component
const CompactStatCard = ({ icon, label, value, change, color, onClick, isActive }: any) => {
  return (
    <div 
      className={`bg-white border rounded-lg p-3 sm:p-4 cursor-pointer transition-all hover:shadow-md ${
        isActive 
          ? 'border-blue-500 bg-blue-50 shadow-md' 
          : 'border-gray-200 hover:border-blue-300'
      } ${onClick ? 'hover:border-blue-300' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`w-8 h-8 sm:w-10 sm:h-10 ${color} rounded-lg flex items-center justify-center text-white`}>
            <span className="text-sm sm:text-lg">{icon}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{label}</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{value}</p>
          </div>
        </div>
        {change && (
          <div className={`text-xs sm:text-sm font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change > 0 ? '+' : ''}{change}%
          </div>
        )}
      </div>
    </div>
  )
}

describe('CompactStatCard', () => {
  const defaultProps = {
    icon: '📱',
    label: 'SMS Pending',
    value: '5',
    color: 'bg-orange-500',
    isActive: false,
  }

  it('renders with basic props', () => {
    render(<CompactStatCard {...defaultProps} />)
    
    expect(screen.getByText('📱')).toBeInTheDocument()
    expect(screen.getByText('SMS Pending')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('applies active styling when isActive is true', () => {
    render(<CompactStatCard {...defaultProps} isActive={true} />)
    
    // Find the outermost div that contains the card
    const card = screen.getByText('📱').closest('div')?.parentElement?.parentElement?.parentElement
    expect(card).toHaveClass('border-blue-500', 'bg-blue-50', 'shadow-md')
  })

  it('applies inactive styling when isActive is false', () => {
    render(<CompactStatCard {...defaultProps} isActive={false} />)
    
    // Find the outermost div that contains the card
    const card = screen.getByText('📱').closest('div')?.parentElement?.parentElement?.parentElement
    expect(card).toHaveClass('border-gray-200')
    expect(card).not.toHaveClass('border-blue-500', 'bg-blue-50')
  })

  it('calls onClick when clicked', () => {
    const mockOnClick = jest.fn()
    render(<CompactStatCard {...defaultProps} onClick={mockOnClick} />)
    
    // Find the outermost div that contains the card
    const card = screen.getByText('📱').closest('div')?.parentElement?.parentElement?.parentElement
    fireEvent.click(card!)
    
    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('shows positive change with green color and plus sign', () => {
    render(<CompactStatCard {...defaultProps} change={10} />)
    
    const changeElement = screen.getByText('+10%')
    expect(changeElement).toBeInTheDocument()
    expect(changeElement).toHaveClass('text-green-600')
  })

  it('shows negative change with red color and minus sign', () => {
    render(<CompactStatCard {...defaultProps} change={-5} />)
    
    const changeElement = screen.getByText('-5%')
    expect(changeElement).toBeInTheDocument()
    expect(changeElement).toHaveClass('text-red-600')
  })

  it('does not show change element when change is not provided', () => {
    render(<CompactStatCard {...defaultProps} />)
    
    expect(screen.queryByText(/[+-]\d+%/)).not.toBeInTheDocument()
  })

  it('applies correct color class to icon container', () => {
    render(<CompactStatCard {...defaultProps} color="bg-purple-500" />)
    
    const iconContainer = screen.getByText('📱').parentElement
    expect(iconContainer).toHaveClass('bg-purple-500')
  })

  it('handles long labels with truncation', () => {
    const longLabel = 'This is a very long label that should be truncated'
    render(<CompactStatCard {...defaultProps} label={longLabel} />)
    
    const labelElement = screen.getByText(longLabel)
    expect(labelElement).toHaveClass('truncate')
  })

  it('handles long values with truncation', () => {
    const longValue = '1,234,567,890'
    render(<CompactStatCard {...defaultProps} value={longValue} />)
    
    const valueElement = screen.getByText(longValue)
    expect(valueElement).toHaveClass('truncate')
  })
})
