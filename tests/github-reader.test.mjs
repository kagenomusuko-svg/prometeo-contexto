import assert from "node:assert/strict";
import { createParadigmaGitHubReader } from "../src/github-reader.mjs";
import { readParadigmaSources } from "../src/query.mjs";

const sourceCommit = "e7c7b06eebd56e412a8b27f3c58747af2d1e531c";
const staleMapPath = "corpus/fuentes/El_metodo_Prometeo_imputacion_causal_para_juristas_y_abogados.md";
const canonicalPath = "corpus/fuentes/El método Prometeo imputación causal para juristas y abogados.md";
const source = "Línea uno del corpus canónico.\nLínea dos conserva el contexto.\nLínea tres permanece fuera del localizador.";
const mapDocument = {
  map_version: "2.12.0",
  schema_status: "frozen",
  phase: "MANT",
  works: [{
    id: "PROMETEO-JUR",
    title: "El método Prometeo: Imputación causal para juristas y abogados",
    source: staleMapPath,
  }],
  evidence: [{
    id: "ev.prometeo.prologue",
    work_id: "PROMETEO-JUR",
    segment: "corpus/libros/metodo-prometeo/prologo.md",
    source_lines: [1, 2],
    section: "Prólogo",
    evidence_type: "primary_text",
  }],
  nodes: [{
    id: "method.prometeo.imputation",
    label: "Método Prometeo de imputación causal",
    summary: "método de imputación causal para el análisis Prometeo",
    evidence: ["ev.prometeo.prologue"],
    evidence_status: "explicit",
  }],
  relations: [],
  routes: [],
};
const calls = [];
const fetchImpl = async (input, init = {}) => {
  const url = new URL(input);
  calls.push({ url: url.toString(), method: init.method, accept: init.headers?.Accept });
  assert.equal(init.method, "GET");
  assert.equal(url.hostname, "api.github.com");
  assert.equal(url.searchParams.get("ref"), sourceCommit);

  if (url.pathname.endsWith("/contents/mapa/mapa-maestro.json")) {
    if (init.headers.Accept === "application/vnd.github.raw+json") {
      return new Response(JSON.stringify(mapDocument), { status: 200 });
    }
    return Response.json({ type: "file", sha: "map-blob-sha" });
  }
  if (url.pathname.endsWith("/contents/" + staleMapPath)) {
    return Response.json({ message: "Not Found" }, { status: 404 });
  }
  if (url.pathname.endsWith("/contents/corpus/fuentes")) {
    return Response.json([{ type: "file", path: canonicalPath, name: canonicalPath.split("/").at(-1) }]);
  }
  if (url.pathname.endsWith("/contents/" + encodeURIComponent(canonicalPath).replaceAll("%2F", "/"))) {
    if (init.headers.Accept === "application/vnd.github.raw+json") {
      return new Response(source, { status: 200 });
    }
    return Response.json({ type: "file", sha: "canonical-blob-sha" });
  }
  throw new Error("Unexpected GitHub request " + url);
};

const reader = createParadigmaGitHubReader({ fetchImpl, sourceCommit });
const mapResult = await reader.query({
  query: "Método Prometeo",
  retrievedAt: "2026-09-29T22:00:00Z",
});
const nodeMatch = mapResult.matches.find((item) => item.id === "method.prometeo.imputation");
assert.ok(nodeMatch);
assert.equal(nodeMatch.sourceLocators[0].evidenceId, "ev.prometeo.prologue");
assert.equal(nodeMatch.sourceLocators[0].canonicalSource, staleMapPath);

const resolved = await readParadigmaSources({
  mapResult: { ...mapResult, matches: [nodeMatch] },
  retrievedAt: "2026-09-29T22:00:01Z",
  readSource: reader.readSource,
});
assert.equal(resolved.sources.length, 1);
assert.equal(resolved.sources[0].id, "ev.prometeo.prologue");
assert.equal(resolved.sources[0].text, "Línea uno del corpus canónico.\nLínea dos conserva el contexto.");
assert.equal(resolved.sources[0].contextOnly, true);
assert.equal(resolved.sources[0].sourceVersion, "canonical-blob-sha");
assert.equal(decodeURIComponent(new URL(resolved.sources[0].sourceRef).pathname), "/kagenomusuko-svg/Paradigma/blob/" + sourceCommit + "/" + canonicalPath);
assert.ok(calls.every((call) => call.method === "GET"));

await assert.rejects(
  () => createParadigmaGitHubReader({ fetchImpl, sourceCommit: "main" }),
  (error) => error.code === "INVALID_SOURCE_COMMIT",
);
console.log("PASS: lector GitHub anclado resuelve evidencia a texto canónico con proveniencia y sólo GET");
