import { TFunction } from 'i18next';

export interface CategoryLike {
  id?: string;
  nameKey?: string | null;
  customName?: string | null;
}

const FALLBACK_CATEGORIES: Record<string, { en: string; ar: string }> = {
  'categories.work': { en: 'Work', ar: 'العمل' },
  'categories.study': { en: 'Study', ar: 'الدراسة' },
  'categories.reading': { en: 'Reading', ar: 'القراءة' },
  'categories.health': { en: 'Health & Fitness', ar: 'الصحة والرياضة' },
  'categories.worship': { en: 'Worship & Prayer', ar: 'العبادة والصلاة' },
  'categories.personal': { en: 'Personal', ar: 'شخصي' },
  'categories.general': { en: 'General', ar: 'عام' },
};

export function getCategoryLabel(category: CategoryLike | null | undefined, t: TFunction, isRTL = false): string {
  if (!category) return '';
  if (category.customName) return category.customName;

  const key = category.nameKey;
  if (key) {
    const translated = t(key);
    if (translated && translated !== key) {
      return translated;
    }
    if (FALLBACK_CATEGORIES[key]) {
      return isRTL ? FALLBACK_CATEGORIES[key].ar : FALLBACK_CATEGORIES[key].en;
    }
    // Also try stripping "categories."
    const shortKey = key.replace(/^categories\./, '');
    const capitalized = shortKey.charAt(0).toUpperCase() + shortKey.slice(1);
    return capitalized;
  }

  return '';
}
