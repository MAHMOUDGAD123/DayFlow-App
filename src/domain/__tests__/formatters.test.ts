import { toArabicIndicNumerals, formatNumber, formatTimeMinutes } from '@/i18n/formatters';

describe('i18n Formatters', () => {
  it('converts western digits to Arabic-Indic digits', () => {
    expect(toArabicIndicNumerals('0123456789')).toBe('٠١٢٣٤٥٦٧٨٩');
    expect(toArabicIndicNumerals(2026)).toBe('٢٠٢٦');
  });

  it('formats numbers correctly by locale', () => {
    expect(formatNumber(42, 'en')).toBe('42');
    expect(formatNumber(42, 'ar')).toBe('٤٢');
  });

  it('formats 24-hour and 12-hour times with English and Arabic locales', () => {
    // 14:30 = 870 minutes
    expect(formatTimeMinutes(870, true, 'en')).toBe('14:30');
    expect(formatTimeMinutes(870, false, 'en')).toBe('2:30 PM');
    expect(formatTimeMinutes(870, true, 'ar')).toBe('١٤:٣٠');
    expect(formatTimeMinutes(870, false, 'ar')).toBe('٢:٣٠ م');

    // 09:05 = 545 minutes
    expect(formatTimeMinutes(545, true, 'en')).toBe('09:05');
    expect(formatTimeMinutes(545, false, 'en')).toBe('9:05 AM');
    expect(formatTimeMinutes(545, true, 'ar')).toBe('٠٩:٠٥');
    expect(formatTimeMinutes(545, false, 'ar')).toBe('٩:٠٥ ص');
  });
});
