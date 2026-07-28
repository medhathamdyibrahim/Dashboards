'use strict';
/* ============================================================
   LOADER-FX.JS — Loads FX Data.xlsx from repo root
   Expected sheet structure:
     Column A: Month label (e.g. "Jan-24", "January 2024", or a date)
     Column B: FX Rate (EGP per 1 USD)
   Populates STATE.fxRates: { 'YYYY-MM': rate }
   Budget FX assumption: 48 EGP/USD (hardcoded for budget figures)
   ============================================================ */

const BUDGET_FX_RATE = 48;  // EGP per USD for budget figures

// ── Month label parser → { year, month } ──────────────────────
function _parseFXMonthLabel(raw) {
  if (!raw) return null;
  const s = String(raw).trim();

  // Skip obvious header rows
  if (/^(date|month|period|fx|rate)/i.test(s)) return null;

  // SAP / Excel serial date (4-6 digit number)
  if (/^\d{4,6}$/.test(s)) {
    const n = parseInt(s);
    if (n > 30000 && n < 100000) {
      const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
    }
  }

  // "Jan-24" or "Jan-2024" or "Jan 2024"
  const m1 = s.match(/^([A-Za-z]{3})[- ](\d{2,4})$/);
  if (m1) {
    const mo = MONTH_NAMES.findIndex(n => n.toLowerCase() === m1[1].toLowerCase());
    if (mo > 0) {
      let yr = parseInt(m1[2]);
      if (yr < 100) yr += 2000;
      return { year: yr, month: mo };
    }
  }

  // "January 2024"
  const m2 = s.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (m2) {
    const mo = MONTH_FULL.findIndex(n => n.toLowerCase() === m2[1].toLowerCase());
    if (mo > 0) return { year: parseInt(m2[2]), month: mo };
  }

  // "2024-01" or "01/2024" or "1/2024"
  const m3 = s.match(/^(\d{4})[/-](\d{1,2})$/) || s.match(/^(\d{1,2})[/-](\d{4})$/);
  if (m3) {
    const a = parseInt(m3[1]), b = parseInt(m3[2]);
    if (a > 100) return { year: a, month: b };
    return { year: b, month: a };
  }

  return null;
}

// ── Main loader ────────────────────────────────────────────────
async function loadFXData(token, username, repo) {
  STATE.fxRates = {};

  try {
    const bytes = await fetchFileBytes(token, username, repo, 'FX Data.xlsx');
    if (!bytes || !bytes.length) {
      console.warn('[FX] FX Data.xlsx not found or empty — USD mode unavailable');
      return;
    }

    const wb = XLSX.read(bytes, { type: 'array', cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    let loaded = 0, skipped = 0;
    for (const row of rows) {
      if (!row[0] || !row[1]) continue;
      const rawRate = String(row[1]).trim();
      // Skip text headers (e.g. "FX", "Rate", "USD")
      if (/^[A-Za-z]/.test(rawRate)) continue;
      const rate = parseFloat(rawRate.replace(/,/g, ''));
      if (!rate || isNaN(rate) || rate <= 0) { skipped++; continue; }

      const parsed = _parseFXMonthLabel(row[0]);
      if (!parsed) { skipped++; continue; }

      const key = `${parsed.year}-${String(parsed.month).padStart(2, '0')}`;
      STATE.fxRates[key] = rate;
      loaded++;
    }

    console.log(`[FX] Loaded ${loaded} monthly FX rates, skipped ${skipped} rows (headers/invalid)`);
  } catch (e) {
    console.warn('[FX] Could not load FX Data.xlsx:', e.message);
  }
}

// ── Get FX rate for a given year/month ────────────────────────
function getFXRate(year, month) {
  const key = `${year}-${String(month).padStart(2, '0')}`;
  return STATE.fxRates[key] || null;
}

// ── Convert EGP amount to USD using the correct monthly rate ──
// For P&L: divide each month's expenses by that month's FX rate, then sum
function convertMonthlyToUSD(egpAmount, year, month) {
  if (!egpAmount || !year || !month) return 0;
  const rate = getFXRate(year, month);
  if (!rate) return 0;
  return egpAmount / rate;
}

// ── Convert YTD EGP rows to USD by summing monthly-converted amounts ──
// rows: array of { year, month, value/amount }
// valueKey: 'value' (sales) or 'amount' (opex) or 'balanceOfMonth' (TB)
function convertRowsToUSD(rows, valueKey = 'value') {
  let total = 0;
  for (const r of rows) {
    const rate = getFXRate(r.year, r.month);
    if (rate) total += (r[valueKey] || 0) / rate;
  }
  return total;
}
