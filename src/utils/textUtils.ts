/**
 * Returns the correct Spanish conjunction between two coordinated terms.
 * "y" becomes "e" before words that start with the vowel sound i (i-, hi-).
 */
export function getSpanishConjunction(nextWord?: string | null): 'y' | 'e' {
  if (!nextWord) return 'y';
  const w = nextWord.trim().toLowerCase();
  if (w.startsWith('i') || w.startsWith('hi')) return 'e';
  return 'y';
}

/**
 * Builds a display name for a (primary [, secondary]) couple using the proper conjunction.
 */
export function buildCoupleDisplayName(
  name: string,
  lastname?: string | null,
  secondaryName?: string | null,
  secondaryLastname?: string | null
): string {
  const primary = `${name}${lastname ? ` ${lastname}` : ''}`.trim();
  const hasSecondary = Boolean(secondaryName && secondaryName.trim().length > 0);
  if (!hasSecondary) return primary;
  const conj = getSpanishConjunction(secondaryName!);
  const secondary = `${secondaryName}${secondaryLastname ? ` ${secondaryLastname}` : ''}`.trim();
  return `${primary} ${conj} ${secondary}`;
}


