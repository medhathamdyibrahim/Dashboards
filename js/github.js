'use strict';
/* ============================================================
   GITHUB.JS — GitHub Contents API + Smart SHA-based Cache
   ============================================================
   Cache strategy (IndexedDB):
   • listFolder() already returns sha for every file — free!
   • fetchFileBytes/Text accept an optional knownSha param.
   • If knownSha matches cache → return cached data instantly,
     zero extra GitHub requests.
   • If sha changed or no cache → fetch full file, update cache.
   • Single metadata request only for standalone files like
     Master Mapping.xlsx (called once at startup).
   ============================================================ */

// ══════════════════════════════════════════════════════════════
//  INDEXEDDB CACHE
// ══════════════════════════════════════════════════════════════
const DB_NAME    = 'FinDashCache';
const DB_VERSION = 1;
const STORE      = 'files';

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'cacheKey' });
      }
    };
    req.onsuccess  = e => { _db = e.target.result; resolve(_db); };
    req.onerror    = e => reject(e.target.error);
  });
}

async function cacheGet(cacheKey) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(cacheKey);
    req.onsuccess = e => resolve(e.target.result || null);
    req.onerror   = e => reject(e.target.error);
  });
}

async function cachePut(cacheKey, sha, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).put({ cacheKey, sha, data });
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
}

async function clearCache() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).clear();
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
}

// ══════════════════════════════════════════════════════════════
//  GITHUB API HELPERS
// ══════════════════════════════════════════════════════════════

async function ghGet(url, token) {
  const res = await fetch(url, {
    headers: {
      'Authorization':        `token ${token}`,
      'Accept':               'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
    }
  });
  if (res.status === 401) throw new Error('Invalid GitHub token (401). Check your PAT.');
  if (res.status === 403) throw new Error('Rate limit or forbidden (403). Try again shortly.');
  if (res.status === 404) throw new Error(`Not found (404): ${url}`);
  return res;
}

function contentsUrl(user, repo, path) {
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  return `https://api.github.com/repos/${encodeURIComponent(user)}/${encodeURIComponent(repo)}/contents/${encoded}`;
}

function blobUrl(user, repo, sha) {
  return `https://api.github.com/repos/${encodeURIComponent(user)}/${encodeURIComponent(repo)}/git/blobs/${sha}`;
}

function b64ToBytes(b64) {
  const clean = b64.replace(/[\n\r\s]/g, '');
  const bin   = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// ── Fetch raw bytes from GitHub (small or large files) ────────
async function _fetchRawBytes(token, user, repo, filePath, metaJson) {
  if (metaJson.content) {
    return b64ToBytes(metaJson.content);
  }
  if (metaJson.sha) {
    const blobRes  = await ghGet(blobUrl(user, repo, metaJson.sha), token);
    const blobJson = await blobRes.json();
    if (!blobJson.content) throw new Error(`Git Blobs API returned no content for ${filePath}`);
    return b64ToBytes(blobJson.content);
  }
  throw new Error(`No content or sha for ${filePath}`);
}

// ══════════════════════════════════════════════════════════════
//  PUBLIC FETCH FUNCTIONS
// ══════════════════════════════════════════════════════════════

/**
 * Fetch binary file as Uint8Array.
 * @param {string} knownSha  — if provided (from listFolder), skips metadata request entirely.
 */
async function fetchFileBytes(token, user, repo, filePath, knownSha = null) {
  const cacheKey = `${user}/${repo}/${filePath}`;

  // If caller already knows the sha (from listFolder), check cache immediately
  if (knownSha) {
    const cached = await cacheGet(cacheKey);
    if (cached && cached.sha === knownSha) {
      console.log(`[Cache HIT] ${filePath}`);
      return cached.data instanceof Uint8Array
        ? cached.data
        : new Uint8Array(Object.values(cached.data));
    }
    // sha changed or not cached — fetch content
    console.log(`[Cache MISS] ${filePath}`);
    // For large files we need to call blobs API with the known sha directly
    let bytes;
    const blobRes  = await ghGet(blobUrl(user, repo, knownSha), token);
    const blobJson = await blobRes.json();
    if (blobJson.content) {
      bytes = b64ToBytes(blobJson.content);
    } else {
      // fallback: get via contents API (handles small files with inline content)
      const res  = await ghGet(contentsUrl(user, repo, filePath), token);
      const meta = await res.json();
      bytes = await _fetchRawBytes(token, user, repo, filePath, meta);
    }
    await cachePut(cacheKey, knownSha, bytes);
    return bytes;
  }

  // No knownSha — fetch metadata first (e.g. Master Mapping.xlsx called standalone)
  const res  = await ghGet(contentsUrl(user, repo, filePath), token);
  const meta = await res.json();
  const sha  = meta.sha;

  const cached = await cacheGet(cacheKey);
  if (cached && cached.sha === sha) {
    console.log(`[Cache HIT] ${filePath}`);
    return cached.data instanceof Uint8Array
      ? cached.data
      : new Uint8Array(Object.values(cached.data));
  }

  console.log(`[Cache MISS] ${filePath}`);
  const bytes = await _fetchRawBytes(token, user, repo, filePath, meta);
  await cachePut(cacheKey, sha, bytes);
  return bytes;
}

/**
 * Fetch text file as UTF-8 string.
 * @param {string} knownSha  — if provided (from listFolder), skips metadata request entirely.
 */
async function fetchFileText(token, user, repo, filePath, knownSha = null) {
  const cacheKey = `${user}/${repo}/${filePath}`;

  if (knownSha) {
    const cached = await cacheGet(cacheKey);
    if (cached && cached.sha === knownSha) {
      console.log(`[Cache HIT] ${filePath}`);
      return cached.data;
    }
    console.log(`[Cache MISS] ${filePath}`);
    const res  = await ghGet(contentsUrl(user, repo, filePath), token);
    const meta = await res.json();
    const bytes = await _fetchRawBytes(token, user, repo, filePath, meta);
    const text  = new TextDecoder('utf-8').decode(bytes);
    await cachePut(cacheKey, knownSha, text);
    return text;
  }

  // No knownSha — fetch metadata first
  const res  = await ghGet(contentsUrl(user, repo, filePath), token);
  const meta = await res.json();
  const sha  = meta.sha;

  const cached = await cacheGet(cacheKey);
  if (cached && cached.sha === sha) {
    console.log(`[Cache HIT] ${filePath}`);
    return cached.data;
  }

  console.log(`[Cache MISS] ${filePath}`);
  const bytes = await _fetchRawBytes(token, user, repo, filePath, meta);
  const text  = new TextDecoder('utf-8').decode(bytes);
  await cachePut(cacheKey, sha, text);
  return text;
}

/**
 * List folder — always fetched fresh (lightweight, ~1 request per folder).
 * Returns items with sha included so loaders can pass it to fetchFileText/Bytes.
 */
async function listFolder(token, user, repo, folderPath) {
  try {
    const url   = contentsUrl(user, repo, folderPath);
    const res   = await ghGet(url, token);
    if (!res.ok) return [];
    const items = await res.json();
    return Array.isArray(items) ? items : [];
  } catch (err) {
    console.warn(`listFolder failed for "${folderPath}":`, err.message);
    return [];
  }
}

// ── Validate credentials ───────────────────────────────────────
async function validateCreds(token, user, repo) {
  try {
    const url = `https://api.github.com/repos/${encodeURIComponent(user)}/${encodeURIComponent(repo)}`;
    const res = await ghGet(url, token);
    return res.ok;
  } catch {
    return false;
  }
}
