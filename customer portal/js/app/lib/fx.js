// lib/fx.js — compiled from src/lib/fx.ts (readable, unminified)
__modules__.define("lib/fx", function (module, exports, require) {
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var fx_exports = {};
__export(fx_exports, {
  convertManyToUsd: () => convertManyToUsd,
  convertToUsd: () => convertToUsd,
  fetchRateFromApi: () => fetchRateFromApi,
  findMissingFxMonths: () => findMissingFxMonths,
  getSuggestedRecentMonths: () => getSuggestedRecentMonths,
  invalidateFxCache: () => invalidateFxCache,
  loadFxRates: () => loadFxRates,
  resolveRate: () => resolveRate
});
module.exports = __toCommonJS(fx_exports);
var import_supabaseClient = require("./supabaseClient");
let cache = null;
const CACHE_MS = 6e4;
async function loadFxRates(force = false) {
  if (!force && cache && Date.now() - cache.loadedAt < CACHE_MS) return cache.rows;
  const { data } = await import_supabaseClient.supabase.from("fx_rates").select("currency_code, year, month, rate");
  cache = { rows: data || [], loadedAt: Date.now() };
  return cache.rows;
}
__name(loadFxRates, "loadFxRates");
function invalidateFxCache() {
  cache = null;
}
__name(invalidateFxCache, "invalidateFxCache");
function resolveRate(rows, currencyCode, dateStr) {
  if (currencyCode === "USD") return { rate: 1, exact: true, year: 0, month: 0 };
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const forCurrency = rows.filter((r) => r.currency_code === currencyCode);
  const exact = forCurrency.find((r) => r.year === y && r.month === m);
  if (exact) return { rate: exact.rate, exact: true, year: y, month: m };
  const earlier = forCurrency.filter((r) => r.year < y || r.year === y && r.month < m).sort((a, b) => b.year - a.year || b.month - a.month);
  if (earlier.length > 0) return { rate: earlier[0].rate, exact: false, year: earlier[0].year, month: earlier[0].month };
  return null;
}
__name(resolveRate, "resolveRate");
function convertToUsd(amount, currencyCode, dateStr, rows) {
  const lookup = resolveRate(rows, currencyCode, dateStr);
  if (!lookup) return { usd: amount, missing: true, approximate: false };
  return { usd: amount / lookup.rate, missing: false, approximate: !lookup.exact };
}
__name(convertToUsd, "convertToUsd");
async function convertManyToUsd(items, getAmount, getCurrency, getDate) {
  const rows = await loadFxRates();
  let total = 0;
  let anyMissing = false;
  let anyApproximate = false;
  for (const item of items) {
    const { usd, missing, approximate } = convertToUsd(getAmount(item), getCurrency(item), getDate(item), rows);
    total += usd;
    if (missing) anyMissing = true;
    if (approximate) anyApproximate = true;
  }
  return { total, anyMissing, anyApproximate };
}
__name(convertManyToUsd, "convertManyToUsd");
async function fetchRateFromApi(currencyCode, year, month) {
  const code = currencyCode.toLowerCase();
  const codeUpper = currencyCode.toUpperCase();
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const now = /* @__PURE__ */ new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const yesterday = now.getDate() - 1;
  const startDay = isCurrentMonth ? Math.max(1, Math.min(lastDayOfMonth, yesterday)) : lastDayOfMonth;
  for (let dayOffset = 0; dayOffset < 6; dayOffset++) {
    const day = startDay - dayOffset;
    if (day < 1) break;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    for (const url of [
      `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${dateStr}/v1/currencies/usd.json`,
      `https://${dateStr}.currency-api.pages.dev/v1/currencies/usd.json`
    ]) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const rate = data?.usd?.[code];
          if (typeof rate === "number" && rate > 0) return { rate, dateUsed: dateStr, source: "fawazahmed0/currency-api" };
        }
      } catch {
      }
    }
    try {
      const res = await fetch(`https://api.frankfurter.dev/v2/rates?date=${dateStr}&base=USD&quotes=${codeUpper}`);
      if (res.ok) {
        const data = await res.json();
        const rate = data?.rates?.[codeUpper];
        if (typeof rate === "number" && rate > 0) return { rate, dateUsed: dateStr, source: "Frankfurter (ECB)" };
      }
    } catch {
    }
    try {
      const res = await fetch(`https://api.exchangerate.host/${dateStr}?base=USD&symbols=${codeUpper}`);
      if (res.ok) {
        const data = await res.json();
        const rate = data?.rates?.[codeUpper];
        if (typeof rate === "number" && rate > 0) return { rate, dateUsed: dateStr, source: "exchangerate.host" };
      }
    } catch {
    }
  }
  return null;
}
__name(fetchRateFromApi, "fetchRateFromApi");
async function getSuggestedRecentMonths(monthsBack = 12) {
  const [{ data: currencies }, rates] = await Promise.all([
    import_supabaseClient.supabase.from("currencies").select("code").neq("code", "USD"),
    loadFxRates(true)
  ]);
  const have = new Set(rates.map((r) => `${r.currency_code}|${r.year}|${r.month}`));
  const now = /* @__PURE__ */ new Date();
  const suggested = [];
  for (const c of currencies || []) {
    for (let i = 0; i < monthsBack; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${c.code}|${d.getFullYear()}|${d.getMonth() + 1}`;
      if (!have.has(key)) suggested.push({ currencyCode: c.code, year: d.getFullYear(), month: d.getMonth() + 1, critical: false });
    }
  }
  return suggested;
}
__name(getSuggestedRecentMonths, "getSuggestedRecentMonths");
async function findMissingFxMonths() {
  const [{ data: pos }, { data: sos }, { data: invoices }, { data: payments }, rates] = await Promise.all([
    import_supabaseClient.supabase.from("purchase_orders").select("currency, po_date"),
    import_supabaseClient.supabase.from("sales_orders").select("currency, so_date"),
    import_supabaseClient.supabase.from("invoices").select("currency, invoice_date"),
    import_supabaseClient.supabase.from("payments").select("currency, payment_date"),
    loadFxRates(true)
  ]);
  const used = /* @__PURE__ */ new Set();
  const add = /* @__PURE__ */ __name((currency, date) => {
    if (!currency || currency === "USD" || !date) return;
    const d = new Date(date);
    if (isNaN(d.getTime())) return;
    used.add(`${currency}|${d.getFullYear()}|${d.getMonth() + 1}`);
  }, "add");
  for (const r of pos || []) add(r.currency, r.po_date);
  for (const r of sos || []) add(r.currency, r.so_date);
  for (const r of invoices || []) add(r.currency, r.invoice_date);
  for (const r of payments || []) add(r.currency, r.payment_date);
  const have = new Set(rates.map((r) => `${r.currency_code}|${r.year}|${r.month}`));
  const missing = [];
  for (const key of used) {
    if (!have.has(key)) {
      const [currencyCode, year, month] = key.split("|");
      missing.push({ currencyCode, year: Number(year), month: Number(month), critical: true });
    }
  }
  return missing.sort((a, b) => a.currencyCode.localeCompare(b.currencyCode) || a.year - b.year || a.month - b.month);
}
__name(findMissingFxMonths, "findMissingFxMonths");

});
