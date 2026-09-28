import { strict as assert } from "node:assert";
import { queryParadigma } from "../src/query.mjs";

const result = queryParadigma({
  mapDocument: {
    map_version: "f1-contract",
    schema_status: "frozen",
    phase: "F1",
    nodes: [{
      id: "node-contract",
      label: "R*",
      locator: { workId: "metrologia-causal", section: "R*" },
      status: "explicit",
    }],
    works: [], evidence: [], relations: [], routes: [],
  },
  query: "R*",
  sourceRef: "kagenomusuko-svg/Paradigma@contract-map",
  retrievedAt: "2026-09-28T20:00:00Z",
});

assert.equal(result.contextStatus, "map-locators-only");
assert.equal(result.requiresSourceReading, true);
assert.ok(Array.isArray(result.matches));
assert.equal(result.provenance.kind, "deterministic-system");
assert.ok(!result.provenance.sourceObjectId.startsWith("prometeo-"));

for (const reference of result.matches.map((match) => ({
  id: match.id,
  category: match.category,
  locator: match.locator,
  evidenceStatus: match.evidenceStatus,
  mapVersion: result.mapVersion,
  sourceRef: result.provenance.sourceObjectId,
}))) {
  for (const field of ["id", "category", "locator", "evidenceStatus", "mapVersion", "sourceRef"]) {
    assert.ok(Object.hasOwn(reference, field), "ContextReference field: " + field);
  }
}

console.log("PASS: contexto conserva ContextReference y frontera externa de Paradigma");
