import { cn } from '../utils'

describe('utils', () => {
  describe('cn function', () => {
    it('combines class names correctly', () => {
      const result = cn('text-[var(--status-critical-text)]', 'bg-primary')
      expect(result).toBe('text-[var(--status-critical-text)] bg-primary')
    })

    it('handles conditional classes', () => {
      const isActive = true
      const result = cn('base-class', isActive && 'active-class')
      expect(result).toBe('base-class active-class')
    })

    it('handles false conditional classes', () => {
      const isActive = false
      const result = cn('base-class', isActive && 'active-class')
      expect(result).toBe('base-class')
    })

    it('handles undefined and null values', () => {
      const result = cn('base-class', undefined, null, 'valid-class')
      expect(result).toBe('base-class valid-class')
    })

    it('handles arrays of classes', () => {
      const result = cn('base-class', ['array-class-1', 'array-class-2'])
      expect(result).toBe('base-class array-class-1 array-class-2')
    })

    it('handles objects with boolean values', () => {
      const result = cn('base-class', {
        'conditional-class': true,
        'ignored-class': false
      })
      expect(result).toBe('base-class conditional-class')
    })

    it('merges conflicting Tailwind classes', () => {
      const result = cn('text-[var(--status-critical-text)]', 'text-primary')
      expect(result).toBe('text-primary')
    })

    it('handles empty inputs', () => {
      const result = cn()
      expect(result).toBe('')
    })

    it('handles single class', () => {
      const result = cn('single-class')
      expect(result).toBe('single-class')
    })
  })
})
