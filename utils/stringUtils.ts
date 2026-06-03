/**
 * Normalizes text by removing accents (diacritics) and converting it to lowercase.
 * This is useful for accent-insensitive and case-insensitive search and comparison.
 */
export const normalizeText = (text: string | null | undefined): string => {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};
