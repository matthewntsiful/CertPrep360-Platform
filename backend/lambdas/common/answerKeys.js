/**
 * Converts legacy answer representations ("AB", "A,B", ["A", "B"])
 * into a canonical, sorted set of option letters. Only A-D are valid for
 * the current four-option question model.
 */
export function normalizeAnswerKey(value) {
  const source = Array.isArray(value) ? value.join("") : String(value || "");
  return [...new Set((source.toUpperCase().match(/[A-D]/g) || []))].sort();
}

export function answerKeysMatch(selected, correct) {
  const selectedKey = normalizeAnswerKey(selected);
  const correctKey = normalizeAnswerKey(correct);
  return selectedKey.length > 0
    && selectedKey.length === correctKey.length
    && selectedKey.every((value, index) => value === correctKey[index]);
}

export function answerCount(value) {
  return normalizeAnswerKey(value).length;
}
