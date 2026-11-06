const ARABIC_INDIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toArabicIndicNumerals(input: string | number): string {
  const str = String(input);
  return str.replace(/[0-9]/g, (digit) => ARABIC_INDIC_DIGITS[parseInt(digit, 10)]);
}

export function formatNumber(value: number, locale: string): string {
  if (locale.startsWith('ar')) {
    return toArabicIndicNumerals(value);
  }
  return String(value);
}

export function formatTimeMinutes(minutes: number, is24Hour: boolean, locale: string): string {
  const clamped = Math.max(0, Math.min(1439, Math.floor(minutes)));
  const rawHours = Math.floor(clamped / 60);
  const rawMins = clamped % 60;
  const minsStr = rawMins < 10 ? `0${rawMins}` : String(rawMins);

  let formatted = '';
  if (is24Hour) {
    const hoursStr = rawHours < 10 ? `0${rawHours}` : String(rawHours);
    formatted = `${hoursStr}:${minsStr}`;
  } else {
    const period = rawHours >= 12 ? 'PM' : 'AM';
    const periodAr = rawHours >= 12 ? 'م' : 'ص';
    const displayHour = rawHours % 12 === 0 ? 12 : rawHours % 12;
    const hourStr = String(displayHour);

    if (locale.startsWith('ar')) {
      return `${toArabicIndicNumerals(hourStr)}:${toArabicIndicNumerals(minsStr)} ${periodAr}`;
    }
    return `${hourStr}:${minsStr} ${period}`;
  }

  if (locale.startsWith('ar')) {
    return toArabicIndicNumerals(formatted);
  }
  return formatted;
}
