import { ContextError, queryParadigma } from "./query.mjs";

const OWNER = "kagenomusuko-svg";
const REPOSITORY = "Paradigma";
const API_ROOT = "https://api.github.com/repos/" + OWNER + "/" + REPOSITORY;
const MAP_PATH = "mapa/mapa-maestro.json";

function requiredString(value, field) {
  if (typeof value !== "string" || value.length === 0) {
    throw new ContextError("MISSING_FIELD", field + " must be a non-empty string");
  }
}

function safeCanonicalPath(path) {
  if (typeof path !== "string" || !path.startsWith("corpus/fuentes/")) {
    throw new ContextError("INVALID_SOURCE_PATH", "only canonical corpus/fuentes paths are readable");
  }
  const parts = path.split("/");
  if (parts.some((part) => part === ".." || part === "." || part.length === 0)) {
    throw new ContextError("INVALID_SOURCE_PATH", "source path contains an invalid segment");
  }
  return path;
}

function normalizeTitle(value) {
  return value
    .replace(/\.md$/iu, "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

/**
 * Create a pinned, GET-only Paradigma reader.
 * Authentication, when needed, belongs to the injected fetchImpl closure;
 * this module never accepts, stores, or exposes a credential.
 */
export function createParadigmaGitHubReader({ fetchImpl = globalThis.fetch, sourceCommit }) {
  if (typeof fetchImpl !== "function") {
    throw new ContextError("FETCH_REQUIRED", "fetchImpl must be a function");
  }
  if (typeof sourceCommit !== "string" || !/^[a-f0-9]{40}$/u.test(sourceCommit)) {
    throw new ContextError("INVALID_SOURCE_COMMIT", "sourceCommit must be a full immutable Git commit SHA");
  }
  const ref = encodeURIComponent(sourceCommit);
  let sourceDirectoryPromise;

  async function request(path, accept, isDirectory = false) {
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    const url = API_ROOT + "/contents/" + encodedPath + "?ref=" + ref;
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { Accept: accept },
    });
    if (!response?.ok) {
      const error = new ContextError(
        response?.status === 404 ? "GITHUB_NOT_FOUND" : "GITHUB_READ_FAILED",
        "GitHub read failed with status " + (response?.status ?? "unknown"),
      );
      error.status = response?.status ?? null;
      throw error;
    }
    if (isDirectory) return response.json();
    if (accept === "application/vnd.github.raw+json") {
      return response.text();
    }
    return response.json();
  }

  async function readPath(path) {
    if (path !== MAP_PATH) safeCanonicalPath(path);
    const metadata = await request(path, "application/vnd.github+json");
    if (!metadata || metadata.type !== "file" || typeof metadata.sha !== "string") {
      throw new ContextError("INVALID_GITHUB_FILE", "GitHub did not return a file and blob SHA for " + path);
    }
    const text = await request(path, "application/vnd.github.raw+json");
    if (typeof text !== "string" || text.length === 0) {
      throw new ContextError("SOURCE_TEXT_UNAVAILABLE", "GitHub returned no text for " + path);
    }
    return {
      text,
      sourceRef: "https://github.com/" + OWNER + "/" + REPOSITORY + "/blob/" + sourceCommit + "/" + path,
      sourceVersion: metadata.sha,
    };
  }

  async function canonicalSources() {
    if (!sourceDirectoryPromise) {
      sourceDirectoryPromise = request("corpus/fuentes", "application/vnd.github+json", true)
        .then((items) => {
          if (!Array.isArray(items)) {
            throw new ContextError("INVALID_SOURCE_DIRECTORY", "corpus/fuentes must be a directory listing");
          }
          return items.filter((item) => item?.type === "file" && typeof item.path === "string");
        });
    }
    return sourceDirectoryPromise;
  }

  async function resolveByTitle(title) {
    requiredString(title, "match.workTitle");
    const target = normalizeTitle(title);
    const matches = (await canonicalSources()).filter((item) =>
      normalizeTitle(item.name ?? item.path.split("/").at(-1)) === target
    );
    if (matches.length === 0) {
      throw new ContextError("SOURCE_PATH_NOT_FOUND", "no canonical source uniquely matches the map work title");
    }
    if (matches.length !== 1) {
      throw new ContextError("AMBIGUOUS_SOURCE_TITLE", "multiple canonical sources match the map work title");
    }
    return safeCanonicalPath(matches[0].path);
  }

  async function readMap() {
    const loaded = await readPath(MAP_PATH);
    try {
      const mapDocument = JSON.parse(loaded.text);
      return { mapDocument, ...loaded };
    } catch {
      throw new ContextError("INVALID_MAP_JSON", "pinned map maestro is not valid JSON");
    }
  }

  return Object.freeze({
    sourceCommit,
    async query({ query, retrievedAt, actorId = "prometeo-contexto" }) {
      const loaded = await readMap();
      return queryParadigma({
        mapDocument: loaded.mapDocument,
        query,
        sourceRef: loaded.sourceRef,
        retrievedAt,
        actorId,
      });
    },
    async readSource(locator, match = {}) {
      let path = match.canonicalSource ?? (
        typeof locator === "string"
          ? locator
          : locator?.sourcePath ?? locator?.path ?? locator?.source ?? null
      );
      if (!path) path = await resolveByTitle(match.workTitle);
      path = safeCanonicalPath(path);
      try {
        return await readPath(path);
      } catch (error) {
        if (error.code !== "GITHUB_NOT_FOUND") throw error;
        path = await resolveByTitle(match.workTitle);
        return readPath(path);
      }
    },
    async readMap() {
      return readMap();
    },
  });
}
