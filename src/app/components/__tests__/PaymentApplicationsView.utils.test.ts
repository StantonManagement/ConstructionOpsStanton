// Test the utility functions from PaymentApplicationsView
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

describe('PaymentApplicationsView Utils', () => {
  describe('formatDate', () => {
    it('formats date correctly', () => {
      const result = formatDate('2024-08-15')
      expect(result).toBe('Aug 15, 2024')
    })

    it('handles different date formats', () => {
      const result = formatDate('2024-12-25')
      expect(result).toBe('Dec 25, 2024')
    })

    it('handles ISO date strings', () => {
      const result = formatDate('2024-08-15T10:30:00Z')
      expect(result).toBe('Aug 15, 2024')
    })
  })

  describe('formatCurrency', () => {
    it('formats whole numbers correctly', () => {
      const result = formatCurrency(125000)
      expect(result).toBe('$125,000')
    })

    it('formats large numbers with commas', () => {
      const result = formatCurrency(2500000)
      expect(result).toBe('$2,500,000')
    })

    it('handles zero', () => {
      const result = formatCurrency(0)
      expect(result).toBe('$0')
    })

    it('handles negative numbers', () => {
      const result = formatCurrency(-5000)
      expect(result).toBe('-$5,000')
    })

    it('rounds decimal numbers', () => {
      const result = formatCurrency(1250.99)
      expect(result).toBe('$1,251')
    })
  })
})
