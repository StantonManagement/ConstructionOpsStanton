import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import ProjectCard from '../ProjectCard'

// Mock project data for testing
const mockProject = {
  id: 1,
  name: 'Downtown Office Building Renovation',
  client_name: 'ABC Development Corp',
  current_phase: 'Construction',
  daysToInspection: 30,
  atRisk: false,
  budget: 2500000,
  spent: 1250000,
  permits: { electrical: 'approved', plumbing: 'pending' },
}

describe('ProjectCard', () => {
  it('renders project information correctly', () => {
    render(<ProjectCard project={mockProject} />)
    
    expect(screen.getByText('Downtown Office Building Renovation')).toBeInTheDocument()
    expect(screen.getByText('ABC Development Corp')).toBeInTheDocument()
    expect(screen.getByText('Phase: Construction')).toBeInTheDocument()
    expect(screen.getByText('$2,500,000')).toBeInTheDocument()
  })

  it('handles missing client name gracefully', () => {
    const projectWithoutClient = { ...mockProject, client_name: '' }
    render(<ProjectCard project={projectWithoutClient} />)
    
    expect(screen.getByText('No client specified')).toBeInTheDocument()
  })

  it('calculates percentage correctly', () => {
    render(<ProjectCard project={mockProject} />)
    
    // 1,250,000 / 2,500,000 = 50%
    expect(screen.getByText('50.00% utilized')).toBeInTheDocument()
  })

  it('handles zero budget gracefully', () => {
    const projectWithZeroBudget = { ...mockProject, budget: 0 }
    render(<ProjectCard project={projectWithZeroBudget} />)
    
    // Check that the budget shows $0
    expect(screen.getByText('$0')).toBeInTheDocument()
    
    // Check that the percentage text is present
    expect(screen.getByText((content, element) => {
      return Boolean(element?.className?.includes('text-muted-foreground font-medium') && 
             element?.textContent?.includes('<0.01%') && 
             element?.textContent?.includes('utilized'))
    })).toBeInTheDocument()
  })
})
