import assert from "node:assert/strict";
import { ContextError } from "../src/query.mjs";
import { createParadigmaReadOnlyFetch } from "../src/github-auth.mjs";

let call;
const authenticatedFetch = createParadigmaReadOnlyFetch({
  token: "read-only-test-token",
  fetchImpl: async (url, init) => {
    call = { url: String(url), method: init.method, authorization: new Headers(init.headers).get("Authorization") };
    return Response.json({ ok: true });
  }
});
await authenticatedFetch(
  "https://api.github.com/repos/kagenomusuko-svg/Paradigma/contents/mapa/mapa-maestro.json",
  { method: "GET", headers: { Accept: "application/vnd.github+json" } }
);
assert.equal(call.method, "GET");
assert.equal(call.authorization, "Bearer read-only-test-token");
assert.ok(call.url.startsWith("https://api.github.com/repos/kagenomusuko-svg/Paradigma/"));

await assert.rejects(
  () => authenticatedFetch("https://example.org/private", { method: "GET" }),
  (error) => error instanceof ContextError && error.code === "GITHUB_HOST_BLOCKED"
);
await assert.rejects(
  () => authenticatedFetch("https://api.github.com/repos/kagenomusuko-svg/Paradigma/contents/mapa/mapa-maestro.json", { method: "POST" }),
  (error) => error instanceof ContextError && error.code === "READ_ONLY_ENFORCED"
);
assert.throws(
  () => createParadigmaReadOnlyFetch({ token: "" }),
  (error) => error instanceof ContextError && error.code === "PARADIGMA_READ_TOKEN_REQUIRED"
);
console.log("PASS: token de Paradigma queda encapsulado, restringido al host GitHub y a GET");
