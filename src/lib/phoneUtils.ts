/**
 * Phone Number Utilities
 * Handles phone number normalization for consistent storage and matching
 */

/**
 * Normalizes a phone number to E.164 format (+1XXXXXXXXXX)
 * This ensures consistent matching between stored numbers and Twilio SMS
 *
 * Examples:
 * - (123) 456-7890 → +11234567890
 * - 123-456-7890 → +11234567890
 * - 1234567890 → +11234567890
 * - +11234567890 → +11234567890
 *
 * @param phone - Phone number in any format
 * @returns Normalized phone number in E.164 format, or null if invalid
 */
export function normalizePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;

  // Remove all non-numeric characters
  const digits = phone.replace(/\D/g, '');

  // Check if we have a valid length
  if (digits.length === 0) return null;

  // Handle different lengths
  if (digits.length === 10) {
    // US number without country code
    return `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    // US number with country code
    return `+${digits}`;
  } else if (digits.length === 11 && !digits.startsWith('1')) {
    // International number
    return `+${digits}`;
  } else if (digits.length > 11) {
    // Might already have a + that was stripped, assume it's complete
    return `+${digits}`;
  }

  // Invalid length or format
  console.warn(`Invalid phone number format: ${phone} (${digits.length} digits)`);
  return null;
}

/**
 * Formats a phone number for display
 *
 * @param phone - Phone number in any format
 * @returns Formatted phone number (123) 456-7890
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';

  const digits = phone.replace(/\D/g, '');

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  return phone; // Return as-is if we can't format it
}

/**
 * Validates if a phone number is in valid format
 *
 * @param phone - Phone number to validate
 * @returns true if valid, false otherwise
 */
export function isValidPhoneNumber(phone: string | null | undefined): boolean {
  return normalizePhoneNumber(phone) !== null;
}
