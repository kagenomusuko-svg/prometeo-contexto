export class ContextError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ContextError";
    this.code = code;
  }
}

function requiredString(value, field) {
  if (typeof value !== "string" || value.length === 0) {
    throw new ContextError("MISSING_FIELD", field + " must be a non-empty string");
  }
}

function searchableText(entry) {
  return [
    entry.label,
    entry.name,
    entry.title,
    entry.description,
    entry.summary,
    entry.symbol,
  ].filter((value) => typeof value === "string").join(" ");
}

function collectionEntries(mapDocument) {
  return [
    ["works", mapDocument.works],
    ["evidence", mapDocument.evidence],
    ["nodes", mapDocument.nodes],
    ["relations", mapDocument.relations],
    ["routes", mapDocument.routes],
  ].flatMap(([category, entries]) =>
    (Array.isArray(entries) ? entries : []).map((entry) => ({ category, entry })),
  );
}

export function queryParadigma({
  mapDocument,
  query,
  sourceRef,
  retrievedAt,
  actorId = "prometeo-contexto",
}) {
  if (!mapDocument || typeof mapDocument !== "object" || Array.isArray(mapDocument)) {
    throw new ContextError("INVALID_MAP", "mapDocument must be an object");
  }
  requiredString(mapDocument.map_version, "mapDocument.map_version");
  requiredString(mapDocument.schema_status, "mapDocument.schema_status");
  requiredString(mapDocument.phase, "mapDocument.phase");
  requiredString(query, "query");
  requiredString(sourceRef, "sourceRef");
  requiredString(retrievedAt, "retrievedAt");
  requiredString(actorId, "actorId");

  const terms = query.toLocaleLowerCase().split(/\s+/u).filter(Boolean);
  const matches = collectionEntries(mapDocument)
    .map(({ category, entry }) => {
      if (!entry || typeof entry !== "object" || typeof entry.id !== "string") {
        return null;
      }
      const text = searchableText(entry).toLocaleLowerCase();
      const score = terms.filter((term) => text.includes(term)).length;
      if (score === 0) return null;
      return {
        id: entry.id,
        category,
        score,
        label: entry.label ?? entry.name ?? entry.title ?? entry.id,
        locator: entry.locator ?? entry.localizer ?? entry.source ?? null,
        evidenceStatus: entry.status ?? entry.evidence_status ?? "unclassified",
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

  return {
    query,
    mapVersion: mapDocument.map_version,
    matches,
    requiresSourceReading: true,
    contextStatus: "map-locators-only",
    provenance: {
      kind: "deterministic-system",
      actorId,
      recordedAt: retrievedAt,
      sourceObjectId: sourceRef,
      sourceVersion: mapDocument.map_version,
      reason: "Paradigma map lookup; map does not replace canonical corpus",
    },
  };
}

function requiredFunction(value, field) {
  if (typeof value !== "function") {
    throw new ContextError("SOURCE_READER_REQUIRED", field + " must be a function");
  }
}

function sourceText(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof value.text === "string") {
    return value.text;
  }
  return null;
}

/**
 * Reads canonical corpus text after map lookup.
 *
 * The reader is injected so Paradigma remains an external, read-only
 * dependency. The returned text is context, not case evidence and cannot
 * promote a linguistic proposal.
 */
export async function readParadigmaSources({
  mapResult,
  readSource,
  retrievedAt,
  actorId = "prometeo-contexto",
}) {
  if (!mapResult || typeof mapResult !== "object" || Array.isArray(mapResult)) {
    throw new ContextError("INVALID_MAP_RESULT", "mapResult must be an object");
  }
  if (mapResult.contextStatus !== "map-locators-only" || mapResult.requiresSourceReading !== true) {
    throw new ContextError(
      "INVALID_MAP_RESULT",
      "mapResult must be an unconsumed map lookup",
    );
  }
  requiredString(mapResult.mapVersion, "mapResult.mapVersion");
  requiredString(retrievedAt, "retrievedAt");
  requiredString(actorId, "actorId");
  requiredFunction(readSource, "readSource");

  const sources = [];
  for (const match of mapResult.matches ?? []) {
    if (!match || typeof match !== "object" || !match.locator) {
      throw new ContextError("SOURCE_LOCATOR_REQUIRED", "every match must have a locator");
    }
    const loaded = await readSource(match.locator, match);
    const text = sourceText(loaded);
    if (!text || text.trim().length === 0) {
      throw new ContextError(
        "SOURCE_TEXT_UNAVAILABLE",
        "reader returned no canonical text for " + match.id,
      );
    }
    const sourceRef = loaded && typeof loaded === "object" ? loaded.sourceRef : null;
    const sourceVersion = loaded && typeof loaded === "object" ? loaded.sourceVersion : null;
    requiredString(sourceRef, "reader result sourceRef");
    requiredString(sourceVersion, "reader result sourceVersion");
    sources.push({
      id: match.id,
      category: match.category,
      label: match.label,
      locator: match.locator,
      text,
      mapEvidenceStatus: match.evidenceStatus,
      sourceRef,
      sourceVersion,
      contextOnly: true,
    });
  }

  return {
    query: mapResult.query,
    mapVersion: mapResult.mapVersion,
    sources,
    contextStatus: "source-text-read",
    requiresSourceReading: false,
    provenance: {
      kind: "deterministic-system",
      actorId,
      recordedAt: retrievedAt,
      sourceObjectId: mapResult.provenance.sourceObjectId,
      sourceVersion: mapResult.mapVersion,
      reason: "Paradigma canonical corpus read after map lookup",
    },
  };
}

