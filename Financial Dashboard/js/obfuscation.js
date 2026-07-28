'use strict';
/* ============================================================
   OBFUSCATION.JS — XOR+Base64 reversible amount encoding
   Applied to OpEx CSV amount columns only.
   TB files use plain numbers — no obfuscation needed.
   ============================================================ */

const OBFUSCATION_CONFIG = {
  key:     'MY#@_PASS',
  enabled: true,
};

// ── XOR-encode string, then Base64 ───────────────────────────────
function obfuscateAmount(value, key) {
  key = key || OBFUSCATION_CONFIG.key;
  const str   = String(value);
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(String.fromCharCode(...bytes));
}

// ── Decode: detect plain number vs Base64-encoded ────────────────
function deobfuscateAmount(val) {
  if (val == null || val === '') return 0;

  // If it looks like a plain number (allows negative, decimal, spaces)
  const cleaned = String(val).trim();
  if (/^-?[\d,.\s]+$/.test(cleaned)) {
    const n = parseFloat(cleaned.replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
  }

  // Otherwise try to decode as Base64 XOR
  if (!OBFUSCATION_CONFIG.enabled) {
    const n = parseFloat(cleaned.replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
  }

  try {
    const key   = OBFUSCATION_CONFIG.key;
    const bin   = atob(cleaned);
    let result  = '';
    for (let i = 0; i < bin.length; i++) {
      result += String.fromCharCode(bin.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    const n = parseFloat(result.replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
  } catch {
    // Fall back to plain parse
    const n = parseFloat(cleaned.replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
  }
}

// ── Browser console utility: obfuscate a batch of values ─────────
function obfuscateBatch(values, key) {
  key = key || OBFUSCATION_CONFIG.key;
  return values.map(v => obfuscateAmount(v, key));
}
