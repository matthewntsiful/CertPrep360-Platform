import test from "node:test";
import assert from "node:assert/strict";
import { getGroups, requireAdmin, requireAuthenticatedUser } from "./security.js";

const adminEvent = {
  requestContext: { authorizer: { claims: { sub: "admin-1", "cognito:groups": "Learners,Admins" } } },
};
const learnerEvent = {
  requestContext: { authorizer: { claims: { sub: "learner-1", "cognito:groups": ["Learners"] } } },
};

test("recognizes administrators only when an authenticated Admins group claim exists", () => {
  assert.deepEqual(getGroups(adminEvent), ["Learners", "Admins"]);
  assert.equal(requireAuthenticatedUser(adminEvent), "admin-1");
  assert.equal(requireAdmin(adminEvent), true);
  assert.equal(requireAdmin(learnerEvent), false);
  assert.equal(requireAdmin({}), false);
});
