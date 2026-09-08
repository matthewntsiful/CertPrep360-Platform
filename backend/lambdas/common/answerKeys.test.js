import test from "node:test";
import assert from "node:assert/strict";
import { answerCount, answerKeysMatch, normalizeAnswerKey } from "./answerKeys.js";

test("normalizes legacy concatenated and delimited answer keys", () => {
  assert.deepEqual(normalizeAnswerKey("AB"), ["A", "B"]);
  assert.deepEqual(normalizeAnswerKey("A, C, F"), ["A", "C"]);
  assert.deepEqual(normalizeAnswerKey(["D", "B"]), ["B", "D"]);
  assert.equal(answerCount("A,B"), 2);
});

test("compares selections independently of order and rejects incomplete selections", () => {
  assert.equal(answerKeysMatch(["B", "A"], "AB"), true);
  assert.equal(answerKeysMatch("A", "AB"), false);
  assert.equal(answerKeysMatch([], "AB"), false);
});
