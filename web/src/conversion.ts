export type Conversion =
  | { state: 'empty' }
  | { state: 'invalid'; error: string }
  | { state: 'valid'; wei: string; gwei: string; eth: string };

export const MAX_DIGITS = 256;

// Move the decimal point using strings: no floating-point rounding, even above 2^53.
function decimalUnits(digits: string, places: number): string {
  const padded = digits.padStart(places + 1, '0');
  const whole = padded.slice(0, -places);
  const fraction = padded.slice(-places).replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole;
}

export function convertWei(raw: string): Conversion {
  const value = raw.trim();
  if (!value) return { state: 'empty' };
  if (!/^(?:[0-9]+|[0-9]{1,3}(?:,[0-9]{3})+)$/.test(value)) {
    return { state: 'invalid', error: 'Enter a whole number of wei, such as 1000000000. Use digits or groups like 1,000.' };
  }
  const digits = value.replace(/,/g, '');
  if (digits.length > MAX_DIGITS) {
    return { state: 'invalid', error: `Use ${MAX_DIGITS} digits or fewer. Your input has not been shortened.` };
  }
  const wei = digits.replace(/^0+(?=\d)/, '');
  return { state: 'valid', wei, gwei: decimalUnits(wei, 9), eth: decimalUnits(wei, 18) };
}
