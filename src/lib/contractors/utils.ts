/**
 * Utility functions for contractor-related operations
 * Following Single Responsibility Principle - each function has one clear purpose
 */

/**
 * Format a number as USD currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get the appropriate emoji icon for a trade
 */
export function getTradeIcon(trade: string): string {
  const icons: Record<string, string> = {
    electrical: '⚡',
    plumbing: '🚰',
    hvac: '❄️',
    carpentry: '🔨',
    concrete: '🧱',
    painting: '🎨',
    roofing: '🏠',
    landscaping: '🌳',
    flooring: '📐',
  };
  return icons[trade.toLowerCase()] || '🔧';
}

/**
 * Calculate contract metrics
 */
export function calculateContractMetrics(contract: {
  original_contract_amount?: number;
  contract_amount?: number;
  paid_to_date?: number;
}) {
  const originalAmount = contract.original_contract_amount || 0;
  const currentAmount = contract.contract_amount || 0;
  const paidToDate = contract.paid_to_date || 0;

  const changeOrders = currentAmount - originalAmount;
  const remaining = currentAmount - paidToDate;
  const percentComplete = currentAmount > 0
    ? Math.round((paidToDate / currentAmount) * 100)
    : 0;

  return {
    originalAmount,
    currentAmount,
    changeOrders,
    paidToDate,
    remaining,
    percentComplete,
  };
}

/**
 * Sort contracts by a given column and direction
 */
export function sortContracts<T extends {
  contractors?: { name?: string; trade?: string };
  contract_amount?: number;
  paid_to_date?: number;
  contract_status?: string;
  display_order?: number;
}>(
  contracts: T[],
  column: string,
  direction: 'asc' | 'desc'
): T[] {
  const sorted = [...contracts];

  sorted.sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (column) {
      case 'name':
        aValue = a.contractors?.name?.toLowerCase() || '';
        bValue = b.contractors?.name?.toLowerCase() || '';
        break;
      case 'trade':
        aValue = a.contractors?.trade?.toLowerCase() || '';
        bValue = b.contractors?.trade?.toLowerCase() || '';
        break;
      case 'contract_amount':
        aValue = a.contract_amount || 0;
        bValue = b.contract_amount || 0;
        break;
      case 'paid_to_date':
        aValue = a.paid_to_date || 0;
        bValue = b.paid_to_date || 0;
        break;
      case 'remaining':
        aValue = (a.contract_amount || 0) - (a.paid_to_date || 0);
        bValue = (b.contract_amount || 0) - (b.paid_to_date || 0);
        break;
      case 'status':
        aValue = a.contract_status || '';
        bValue = b.contract_status || '';
        break;
      default:
        aValue = a.display_order || 0;
        bValue = b.display_order || 0;
    }

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
}
