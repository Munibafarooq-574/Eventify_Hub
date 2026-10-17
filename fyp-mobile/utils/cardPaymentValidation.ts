// Phase 12A uses only published, synthetic test cards. These are not live payments.
export const DEMO_CARD_OPTIONS = [
  { id: 'visa', brand: 'Visa', number: '4242424242424242', cvvLength: 3 },
  { id: 'mastercard', brand: 'Mastercard', number: '5555555555554444', cvvLength: 3 },
  { id: 'amex', brand: 'American Express', number: '378282246310005', cvvLength: 4 },
] as const;
export type DemoCardId = typeof DEMO_CARD_OPTIONS[number]['id'];
export const cardDigits = (value: string) => value.replace(/\D/g, '');
export function formatCardNumber(value: string): string {
  const digits = cardDigits(value).slice(0, 19);
  return /^3[47]/.test(digits)
    ? [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)].filter(Boolean).join(' ')
    : digits.replace(/(.{4})/g, '$1 ').trim();
}
export function formatExpiry(value: string): string {
  const digits = cardDigits(value).slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}/${digits.slice(2)}`;
}
export function isCardNumberValid(value: string): boolean {
  if (!/^[\d\s-]+$/.test(value)) return false;
  const digits = cardDigits(value);
  if (digits.length < 13 || digits.length > 19 || /^(\d)\1+$/.test(digits)) return false;
  let sum = 0; let double = false;
  for (let index = digits.length - 1; index >= 0; index--) {
    let digit = Number(digits[index]);
    if (double) { digit *= 2; if (digit > 9) digit -= 9; }
    sum += digit; double = !double;
  }
  return sum % 10 === 0;
}
export function isExpiryValid(value: string, now = new Date()): boolean {
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(value);
  if (!match) return false;
  const year = 2000 + Number(match[2]);
  return year > now.getFullYear() || (year === now.getFullYear() && Number(match[1]) >= now.getMonth() + 1);
}
export function getDemoCard(value: string) {
  return DEMO_CARD_OPTIONS.find(card => card.number === cardDigits(value));
}
export function validateCardForm(input: { name: string; number: string; expiry: string; cvv: string }, now = new Date()) {
  const demo = getDemoCard(input.number);
  const errors = {
    name: input.name.trim().length >= 2 && input.name.trim().length <= 80 && /\p{L}/u.test(input.name) && !/[\u0000-\u001f\u007f]/.test(input.name) ? '' : 'Enter the cardholder name (2–80 characters).',
    number: !isCardNumberValid(input.number) ? 'Enter a valid card number.' : !demo ? 'Use a test card listed below. Real cards are not accepted here.' : '',
    expiry: isExpiryValid(input.expiry, now) ? '' : 'Enter a valid, unexpired date in MM/YY format.',
    cvv: new RegExp(`^\\d{${demo?.cvvLength || 3}}$`).test(input.cvv) ? '' : `Enter exactly ${demo?.cvvLength || 3} digits.`,
  };
  return { errors, valid: Object.values(errors).every(value => !value), demo };
}
export function cardPaymentAmount(data: { organizerId?: string; paymentStatus?: string; downPaymentAmount?: number; outstandingAmount?: number; pendingPayment?: unknown }, type: string, expectedOwnerId?: string): number {
  if (expectedOwnerId && data.organizerId !== expectedOwnerId) throw new Error('Your account changed. Reopen payment from your booking.');
  if (data.pendingPayment) throw new Error('A payment is already awaiting confirmation for this booking.');
  const status = String(data.paymentStatus || '').toUpperCase();
  if (type === 'REMAINING' ? status !== 'PARTIALLY_PAID' : type !== 'DOWN_PAYMENT' || !['PAYMENT_REQUIRED', 'PAYMENT_FAILED'].includes(status)) {
    throw new Error('This payment is not currently due. Return to your booking and refresh.');
  }
  const amount = type === 'REMAINING' ? data.outstandingAmount : data.downPaymentAmount;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) throw new Error('No valid payable amount is available.');
  return amount;
}
