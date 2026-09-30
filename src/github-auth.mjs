import { ContextError } from "./query.mjs";

/**
 * Bind a read-only GitHub token to the Paradigma Contents API.
 * The token remains inside this closure and is sent only on GET requests to api.github.com.
 */
export function createParadigmaReadOnlyFetch({ token, fetchImpl = globalThis.fetch }) {
  if (typeof token !== "string" || token.trim().length === 0) {
    throw new ContextError("PARADIGMA_READ_TOKEN_REQUIRED", "a read-only Paradigma token is required");
  }
  if (typeof fetchImpl !== "function") {
    throw new ContextError("FETCH_REQUIRED", "fetchImpl must be a function");
  }
  const secret = token.trim();

  return async function fetchParadigma(input, init = {}) {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.hostname !== "api.github.com") {
      throw new ContextError("GITHUB_HOST_BLOCKED", "authenticated requests are restricted to api.github.com");
    }
    if (String(init.method ?? "GET").toUpperCase() !== "GET") {
      throw new ContextError("READ_ONLY_ENFORCED", "Paradigma access permits GET requests only");
    }
    const headers = new Headers(init.headers ?? {});
    headers.set("Authorization", "Bearer " + secret);
    return fetchImpl(url, { ...init, method: "GET", headers });
  };
}
