const DEFAULT_ORIGIN = "https://aws-exams-dev.matthewntsiful.com";

export function responseHeaders() {
  return {
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || DEFAULT_ORIGIN,
    "Content-Type": "application/json",
  };
}

export function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: responseHeaders(),
    body: JSON.stringify(body),
  };
}

export function parseJsonBody(event) {
  if (!event?.body) return {};
  if (typeof event.body === "object") return event.body;
  return JSON.parse(event.body);
}

export function getClaims(event) {
  return event?.requestContext?.authorizer?.claims || {};
}

export function getGroups(event) {
  const groups = getClaims(event)["cognito:groups"];
  if (Array.isArray(groups)) return groups;
  if (typeof groups === "string") return groups.split(",").map(group => group.trim()).filter(Boolean);
  return [];
}

export function requireAuthenticatedUser(event) {
  return getClaims(event).sub || null;
}

export function requireAdmin(event) {
  return Boolean(requireAuthenticatedUser(event) && getGroups(event).includes("Admins"));
}

/**
 * Logs only operational metadata. Request bodies, authorization headers, claims,
 * tokens, payment references, and learner responses must never be logged.
 */
export function logRequest(event, route) {
  console.info(JSON.stringify({
    event: "request_received",
    route,
    requestId: event?.requestContext?.requestId || event?.requestContext?.requestId || null,
    method: event?.httpMethod || null,
    authenticated: Boolean(requireAuthenticatedUser(event)),
  }));
}

export function logError(route, error, requestId = null) {
  console.error(JSON.stringify({
    event: "request_failed",
    route,
    requestId,
    errorName: error instanceof Error ? error.name : "UnknownError",
  }));
}
