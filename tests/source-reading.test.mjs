import { strict as assert } from "node:assert";
import { queryParadigma, readParadigmaSources, ContextError } from "../src/query.mjs";

const mapDocument = {
  map_version: "f1-real-corpus-contract",
  schema_status: "frozen",
  phase: "F1",
  nodes: [{
    id: "node-r-star",
    label: "R*",
    description: "objeto formal de metrología causal",
    locator: { workId: "metrologia-causal", sourcePath: "corpus/fuentes/metrologia.md", section: "definición de R*" },
    status: "explicit",
  }],
  routes: [], works: [], evidence: [], relations: [],
};

const mapResult = queryParadigma({
  mapDocument,
  query: "R*",
  sourceRef: "kagenomusuko-svg/Paradigma@map-commit",
  retrievedAt: "2026-09-29T12:00:00Z",
});

const reads = [];
const resolved = await readParadigmaSources({
  mapResult,
  retrievedAt: "2026-09-29T12:00:01Z",
  readSource: async (locator, match) => {
    reads.push({ locator, matchId: match.id });
    return {
      text: "R* se define en el corpus canónico como una estructura formal con dependencias explícitas.",
      sourceRef: "kagenomusuko-svg/Paradigma@corpus-commit",
      sourceVersion: "sha256:canonical-source",
    };
  },
});

assert.equal(resolved.contextStatus, "source-text-read");
assert.equal(resolved.requiresSourceReading, false);
assert.equal(reads.length, 1);
assert.match(resolved.sources[0].text, /corpus canónico/);
assert.equal(resolved.sources[0].contextOnly, true);
assert.equal(resolved.sources[0].sourceRef, "kagenomusuko-svg/Paradigma@corpus-commit");
assert.equal(resolved.provenance.sourceObjectId, "kagenomusuko-svg/Paradigma@map-commit");

await assert.rejects(
  () => readParadigmaSources({
    mapResult,
    retrievedAt: "2026-09-29T12:00:01Z",
    readSource: async () => ({
      text: "texto sin referencia verificable",
      sourceRef: "",
      sourceVersion: "sha256:missing-ref",
    }),
  }),
  (error) => error instanceof ContextError && error.code === "MISSING_FIELD",
);

await assert.rejects(
  () => readParadigmaSources({
    mapResult,
    retrievedAt: "2026-09-29T12:00:01Z",
    readSource: async () => ({ sourceRef: "Paradigma@corpus", sourceVersion: "sha256:empty", text: " " }),
  }),
  (error) => error instanceof ContextError && error.code === "SOURCE_TEXT_UNAVAILABLE",
);

await assert.rejects(
  () => readParadigmaSources({
    mapResult,
    retrievedAt: "2026-09-29T12:00:01Z",
  }),
  (error) => error instanceof ContextError && error.code === "SOURCE_READER_REQUIRED",
);

console.log("PASS: contexto lee texto canónico con proveniencia y permanece sólo contextual");
