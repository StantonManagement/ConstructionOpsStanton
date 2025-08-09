
import { VALIDATION } from './constants';

// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\(\d{3}\)\s\d{3}-\d{4}$|^\d{10}$/;
  return phoneRegex.test(phone);
};

// Percentage validation
export const isValidPercentage = (value: number): boolean => {
  return value >= VALIDATION.MIN_PERCENTAGE && value <= VALIDATION.MAX_PERCENTAGE;
};

// Amount validation
export const isValidAmount = (amount: number): boolean => {
  return amount >= VALIDATION.MIN_AMOUNT && !isNaN(amount);
};

// Required field validation
export const validateRequiredFields = (
  data: Record<string, any>,
  requiredFields: string[]
): string[] => {
  const missing: string[] = [];
  
  requiredFields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      missing.push(field);
    }
  });
  
  return missing;
};

// Form validation
export const validateForm = (
  formData: Record<string, any>,
  rules: Record<string, (value: any) => boolean | string>
): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  Object.keys(rules).forEach(field => {
    const rule = rules[field];
    const result = rule(formData[field]);
    
    if (typeof result === 'string') {
      errors[field] = result;
    } else if (result === false) {
      errors[field] = `Invalid ${field}`;
    }
  });
  
  return errors;
};
