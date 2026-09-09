/** Normalizes legacy answer formats such as "AB" and "A, B". */
export function normalizeAnswerKey(value: unknown): string[] {
  const source = Array.isArray(value) ? value.join('') : String(value ?? '');
  return [...new Set(source.toUpperCase().match(/[A-F]/g) ?? [])].sort();
}

export function answersMatch(selected: string | string[] | null | undefined, correct: unknown): boolean {
  const selectedKey = normalizeAnswerKey(selected);
  const correctKey = normalizeAnswerKey(correct);
  return selectedKey.length > 0
    && selectedKey.length === correctKey.length
    && selectedKey.every((letter, index) => letter === correctKey[index]);
}
