// pages/FxRates/List.js — compiled from src/pages/FxRates/List.tsx (readable, unminified)
__modules__.define("pages/FxRates/List", function (module, exports, require) {
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var List_exports = {};
__export(List_exports, {
  default: () => FxRatesList
});
module.exports = __toCommonJS(List_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_react = require("react");
var import_supabaseClient = require("../../lib/supabaseClient");
var import_AuthContext = require("../../context/AuthContext");
var import_LanguageContext = require("../../context/LanguageContext");
var import_ui = require("../../lib/ui");
var import_Modal = __toESM(require("../../components/Modal"));
var import_fx = require("../../lib/fx");
const MONTH_NAMES = ["\u064A\u0646\u0627\u064A\u0631", "\u0641\u0628\u0631\u0627\u064A\u0631", "\u0645\u0627\u0631\u0633", "\u0623\u0628\u0631\u064A\u0644", "\u0645\u0627\u064A\u0648", "\u064A\u0648\u0646\u064A\u0648", "\u064A\u0648\u0644\u064A\u0648", "\u0623\u063A\u0633\u0637\u0633", "\u0633\u0628\u062A\u0645\u0628\u0631", "\u0623\u0643\u062A\u0648\u0628\u0631", "\u0646\u0648\u0641\u0645\u0628\u0631", "\u062F\u064A\u0633\u0645\u0628\u0631"];
function FxRatesList() {
  const { isAdmin, userId } = (0, import_AuthContext.useAuth)();
  const { t } = (0, import_LanguageContext.useLanguage)();
  const [rows, setRows] = (0, import_react.useState)([]);
  const [currencies, setCurrencies] = (0, import_react.useState)([]);
  const [missing, setMissing] = (0, import_react.useState)([]);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [showForm, setShowForm] = (0, import_react.useState)(false);
  const [editKey, setEditKey] = (0, import_react.useState)(null);
  const [fCurrency, setFCurrency] = (0, import_react.useState)("");
  const [fYear, setFYear] = (0, import_react.useState)((/* @__PURE__ */ new Date()).getFullYear());
  const [fMonth, setFMonth] = (0, import_react.useState)((/* @__PURE__ */ new Date()).getMonth() + 1);
  const [fRate, setFRate] = (0, import_react.useState)("");
  const [saving, setSaving] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  const [info, setInfo] = (0, import_react.useState)(null);
  const [fetchingKey, setFetchingKey] = (0, import_react.useState)(null);
  const [autoSyncing, setAutoSyncing] = (0, import_react.useState)(false);
  const [autoSyncResult, setAutoSyncResult] = (0, import_react.useState)(null);
  async function load() {
    setLoading(true);
    const [rates, curRes, criticalMissing, suggested] = await Promise.all([
      (0, import_fx.loadFxRates)(true),
      import_supabaseClient.supabase.from("currencies").select("*").neq("code", "USD").order("code"),
      (0, import_fx.findMissingFxMonths)(),
      (0, import_fx.getSuggestedRecentMonths)(12)
    ]);
    setRows(rates.sort((a, b) => a.currency_code.localeCompare(b.currency_code) || b.year - a.year || b.month - a.month));
    setCurrencies(curRes.data || []);
    const merged = /* @__PURE__ */ new Map();
    for (const m of suggested) merged.set(`${m.currencyCode}|${m.year}|${m.month}`, m);
    for (const m of criticalMissing) merged.set(`${m.currencyCode}|${m.year}|${m.month}`, m);
    const combined = Array.from(merged.values()).sort(
      (a, b) => (a.critical === b.critical ? 0 : a.critical ? -1 : 1) || a.currencyCode.localeCompare(b.currencyCode) || b.year - a.year || b.month - a.month
    );
    setMissing(combined);
    setLoading(false);
  }
  __name(load, "load");
  (0, import_react.useEffect)(() => {
    load();
  }, []);
  if (!isAdmin) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "rounded-2xl border p-6 text-sm", style: { background: "var(--color-danger-soft)", borderColor: "var(--color-border)", color: "var(--color-danger)" }, children: t("\u0647\u0630\u0647 \u0627\u0644\u0634\u0627\u0634\u0629 \u0645\u062A\u0627\u062D\u0629 \u0644\u0644\u0623\u062F\u0645\u0646 \u0641\u0642\u0637.") });
  }
  function openNew(prefill) {
    setEditKey(null);
    setFCurrency(prefill?.currencyCode || currencies[0]?.code || "");
    setFYear(prefill?.year || (/* @__PURE__ */ new Date()).getFullYear());
    setFMonth(prefill?.month || (/* @__PURE__ */ new Date()).getMonth() + 1);
    setFRate("");
    setError(null);
    setInfo(null);
    setShowForm(true);
  }
  __name(openNew, "openNew");
  function openEdit(r) {
    setEditKey(`${r.currency_code}|${r.year}|${r.month}`);
    setFCurrency(r.currency_code);
    setFYear(r.year);
    setFMonth(r.month);
    setFRate(String(r.rate));
    setError(null);
    setInfo(null);
    setShowForm(true);
  }
  __name(openEdit, "openEdit");
  async function handleAutoFetch(m) {
    const key = `${m.currencyCode}|${m.year}|${m.month}`;
    setFetchingKey(key);
    try {
      const result = await (0, import_fx.fetchRateFromApi)(m.currencyCode, m.year, m.month);
      if (!result) {
        alert(t("\u062A\u0639\u0630\u0651\u0631 \u062C\u0644\u0628 \u0627\u0644\u0633\u0639\u0631 \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627 \u0644\u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0631. \u0623\u062F\u062E\u0644\u0647 \u064A\u062F\u0648\u064A\u064B\u0627."));
        openNew(m);
        return;
      }
      setEditKey(null);
      setFCurrency(m.currencyCode);
      setFYear(m.year);
      setFMonth(m.month);
      setFRate(String(result.rate));
      setInfo(t("\u062A\u0645 \u0627\u0644\u062C\u0644\u0628 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A \u0628\u062A\u0627\u0631\u064A\u062E") + ` ${result.dateUsed} (${result.source}) \u2014 ${t("\u0631\u0627\u062C\u0639 \u0627\u0644\u0633\u0639\u0631 \u0648\u0627\u062D\u0641\u0638 \u0644\u0644\u062A\u0623\u0643\u064A\u062F.")}`);
      setError(null);
      setShowForm(true);
    } finally {
      setFetchingKey(null);
    }
  }
  __name(handleAutoFetch, "handleAutoFetch");
  async function handleAutoSyncAll() {
    setAutoSyncing(true);
    setAutoSyncResult(null);
    let ok = 0;
    const failed = [];
    for (const m of missing) {
      const result = await (0, import_fx.fetchRateFromApi)(m.currencyCode, m.year, m.month);
      if (!result) {
        failed.push(`${m.currencyCode} ${MONTH_NAMES[m.month - 1]} ${m.year}`);
        continue;
      }
      const { error: upErr } = await import_supabaseClient.supabase.from("fx_rates").upsert(
        { currency_code: m.currencyCode, year: m.year, month: m.month, rate: result.rate, updated_by: userId, updated_at: (/* @__PURE__ */ new Date()).toISOString() },
        { onConflict: "currency_code,year,month" }
      );
      if (upErr) failed.push(`${m.currencyCode} ${MONTH_NAMES[m.month - 1]} ${m.year}`);
      else ok += 1;
    }
    (0, import_fx.invalidateFxCache)();
    setAutoSyncResult({ ok, failed });
    setAutoSyncing(false);
    load();
  }
  __name(handleAutoSyncAll, "handleAutoSyncAll");
  async function handleSave(e) {
    e.preventDefault();
    const rate = Number(fRate);
    if (!fCurrency) {
      setError(t("\u0627\u062E\u062A\u0631 \u0627\u0644\u0639\u0645\u0644\u0629"));
      return;
    }
    if (!rate || rate <= 0) {
      setError(t("\u0623\u062F\u062E\u0644 \u0633\u0639\u0631 \u0635\u0631\u0641 \u0635\u062D\u064A\u062D \u0623\u0643\u0628\u0631 \u0645\u0646 \u0635\u0641\u0631"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { error: upErr } = await import_supabaseClient.supabase.from("fx_rates").upsert(
        { currency_code: fCurrency, year: fYear, month: fMonth, rate, updated_by: userId, updated_at: (/* @__PURE__ */ new Date()).toISOString() },
        { onConflict: "currency_code,year,month" }
      );
      if (upErr) throw upErr;
      (0, import_fx.invalidateFxCache)();
      setShowForm(false);
      load();
    } catch (err) {
      setError(t("\u062D\u062F\u062B \u062E\u0637\u0623: ") + err.message);
    } finally {
      setSaving(false);
    }
  }
  __name(handleSave, "handleSave");
  async function handleDelete(r) {
    if (!confirm(t("\u062D\u0630\u0641 \u0633\u0639\u0631 \u0627\u0644\u0635\u0631\u0641 \u062F\u0647\u061F"))) return;
    await import_supabaseClient.supabase.from("fx_rates").delete().eq("currency_code", r.currency_code).eq("year", r.year).eq("month", r.month);
    (0, import_fx.invalidateFxCache)();
    load();
  }
  __name(handleDelete, "handleDelete");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-5", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between flex-wrap gap-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "font-display font-extrabold text-2xl", children: t("\u0623\u0633\u0639\u0627\u0631 \u0627\u0644\u0635\u0631\u0641 (FX Rates)") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-xs mt-1", style: { color: "var(--color-ink-soft)" }, children: t("\u0633\u0639\u0631 \u0634\u0647\u0631\u064A \u0644\u0643\u0644 \u0639\u0645\u0644\u0629 (\u0643\u0627\u0645 \u0648\u062D\u062F\u0629 \u062A\u0633\u0627\u0648\u064A 1 \u062F\u0648\u0644\u0627\u0631) \u2014 \u064A\u064F\u0633\u062A\u062E\u062F\u0645 \u0644\u062A\u062D\u0648\u064A\u0644 \u0643\u0644 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0627\u062A \u0627\u0644\u0645\u062E\u062A\u0644\u0637\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u062A \u0625\u0644\u0649 \u062F\u0648\u0644\u0627\u0631 \u0641\u064A \u0627\u0644\u062F\u0627\u0634\u0628\u0648\u0631\u062F \u0648\u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631.") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => openNew(), className: import_ui.btnPrimary, style: import_ui.btnPrimaryStyle, children: [
        "+ ",
        t("\u0625\u0636\u0627\u0641\u0629 \u0633\u0639\u0631 \u0635\u0631\u0641")
      ] })
    ] }),
    missing.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "rounded-2xl border p-4 text-sm space-y-3", style: { background: "var(--color-accent-soft)", borderColor: "var(--color-border)" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between flex-wrap gap-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "font-semibold", children: missing.some((m) => m.critical) ? `\u26A0\uFE0F ${t("\u064A\u0648\u062C\u062F")} ${missing.filter((m) => m.critical).length} ${t("\u0634\u0647\u0631/\u0639\u0645\u0644\u0629 \u0645\u0633\u062A\u062E\u062F\u0645\u0629 \u0641\u064A \u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0641\u0639\u0644\u064A\u0629 \u0628\u062F\u0648\u0646 \u0633\u0639\u0631 \u0635\u0631\u0641 \u0645\u0633\u062C\u0651\u0644\u060C \u0628\u0627\u0644\u0625\u0636\u0627\u0641\u0629 \u0644\u0627\u0642\u062A\u0631\u0627\u062D\u0627\u062A \u0622\u062E\u0631 12 \u0634\u0647\u0631:")}` : `\u{1F4A1} ${t("\u0627\u0642\u062A\u0631\u0627\u062D: \u0622\u062E\u0631 12 \u0634\u0647\u0631 \u0628\u062F\u0648\u0646 \u0633\u0639\u0631 \u0635\u0631\u0641 \u0645\u0633\u062C\u0651\u0644 \u0644\u0643\u0644 \u0639\u0645\u0644\u0629 \u2014 \u062C\u0647\u0651\u0632\u0647\u0645 \u0645\u0642\u062F\u0645\u064B\u0627 \u0642\u0628\u0644 \u0645\u0627 \u062A\u062D\u062A\u0627\u062C\u0647\u0645:")}` }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            onClick: handleAutoSyncAll,
            disabled: autoSyncing,
            className: "text-xs font-semibold px-3 py-1.5 rounded-full",
            style: { background: "var(--color-primary)", color: "white" },
            children: autoSyncing ? t("...\u062C\u0627\u0631\u064A \u0627\u0644\u062C\u0644\u0628 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A \u0644\u0644\u0643\u0644") : `\u{1F504} ${t("\u062C\u0644\u0628 \u062A\u0644\u0642\u0627\u0626\u064A \u0644\u0644\u0643\u0644")}`
          }
        )
      ] }),
      autoSyncResult && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "text-xs", style: { color: autoSyncResult.failed.length ? "var(--color-danger)" : "var(--color-primary)" }, children: [
        "\u2713 ",
        autoSyncResult.ok,
        " ",
        t("\u062A\u0645 \u062C\u0644\u0628\u0647\u0627 \u0648\u062D\u0641\u0638\u0647\u0627 \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627."),
        autoSyncResult.failed.length > 0 && ` \u2014 \u26A0\uFE0F ${autoSyncResult.failed.length} ${t("\u062A\u0639\u0630\u0651\u0631 \u062C\u0644\u0628\u0647\u0627 (\u0623\u062F\u062E\u0644\u0647\u0627 \u064A\u062F\u0648\u064A\u064B\u0627):")} ${autoSyncResult.failed.join("\u060C ")}`
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex flex-wrap gap-2", children: missing.map((m) => {
        const key = `${m.currencyCode}|${m.year}|${m.month}`;
        return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "div",
          {
            className: "flex items-center gap-1 rounded-full border overflow-hidden",
            style: { borderColor: m.critical ? "var(--color-danger)" : "var(--color-border)", background: "var(--color-surface)" },
            title: m.critical ? t("\u0645\u0633\u062A\u062E\u062F\u0645\u0629 \u0641\u064A \u0645\u0633\u062A\u0646\u062F \u0641\u0639\u0644\u064A") : t("\u0627\u0642\u062A\u0631\u0627\u062D \u0627\u0633\u062A\u0628\u0627\u0642\u064A (\u0622\u062E\u0631 12 \u0634\u0647\u0631)"),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => openNew(m), className: "text-xs font-semibold ps-2.5 pe-1 py-1 hover:opacity-80", children: [
                m.critical && "\u26A0\uFE0F ",
                m.currencyCode,
                " \u2014 ",
                t(MONTH_NAMES[m.month - 1]),
                " ",
                m.year
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  onClick: () => handleAutoFetch(m),
                  disabled: fetchingKey === key,
                  title: t("\u062C\u0644\u0628 \u062A\u0644\u0642\u0627\u0626\u064A"),
                  className: "text-xs px-2 py-1 hover:opacity-80",
                  style: { borderInlineStart: "1px solid var(--color-border)", color: "var(--color-primary)" },
                  children: fetchingKey === key ? "\u2026" : "\u{1F504}"
                }
              )
            ]
          },
          key
        );
      }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `${import_ui.card} overflow-hidden`, style: import_ui.cardStyle, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "w-full", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u0639\u0645\u0644\u0629") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u0634\u0647\u0631") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u0633\u0646\u0629") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u0633\u0639\u0631 (\u0648\u062D\u062F\u0627\u062A = 1 \u062F\u0648\u0644\u0627\u0631)") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { colSpan: 5, className: "px-3 py-8 text-center text-sm", style: { color: "var(--color-ink-soft)" }, children: t("...\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644") }) }) : rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { colSpan: 5, className: "px-3 py-8 text-center text-sm", style: { color: "var(--color-ink-soft)" }, children: t("\u0644\u0627 \u062A\u0648\u062C\u062F \u0623\u0633\u0639\u0627\u0631 \u0635\u0631\u0641 \u0645\u0633\u062C\u0651\u0644\u0629 \u0628\u0639\u062F") }) }) : rows.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: "border-t hover:bg-[var(--color-bg)]", style: { borderColor: "var(--color-border)" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} font-semibold`, children: r.currency_code }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: import_ui.td, children: t(MONTH_NAMES[r.month - 1]) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} tabular`, children: r.year }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} tabular`, children: r.rate.toLocaleString("en-US", { maximumFractionDigits: 6 }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: import_ui.td, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => openEdit(r), className: "text-xs font-semibold me-3", style: { color: "var(--color-primary)" }, children: t("\u062A\u0639\u062F\u064A\u0644") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => handleDelete(r), className: "text-xs font-semibold", style: { color: "var(--color-danger)" }, children: t("\u062D\u0630\u0641") })
        ] })
      ] }, `${r.currency_code}-${r.year}-${r.month}`)) })
    ] }) }),
    showForm && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_Modal.default, { title: editKey ? t("\u062A\u0639\u062F\u064A\u0644 \u0633\u0639\u0631 \u0635\u0631\u0641") : t("\u0625\u0636\u0627\u0641\u0629 \u0633\u0639\u0631 \u0635\u0631\u0641"), onClose: () => setShowForm(false), children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: handleSave, className: "space-y-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0627\u0644\u0639\u0645\u0644\u0629 *") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { required: true, className: import_ui.input, style: import_ui.inputStyle, value: fCurrency, onChange: (e) => setFCurrency(e.target.value), disabled: !!editKey, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: t("\u0627\u062E\u062A\u0631...") }),
          currencies.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: c.code, children: c.code }, c.code))
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0627\u0644\u0634\u0647\u0631 *") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", { required: true, className: import_ui.input, style: import_ui.inputStyle, value: fMonth, onChange: (e) => setFMonth(Number(e.target.value)), disabled: !!editKey, children: MONTH_NAMES.map((name, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: i + 1, children: t(name) }, i)) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0627\u0644\u0633\u0646\u0629 *") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { required: true, type: "number", className: `${import_ui.input} tabular`, style: import_ui.inputStyle, value: fYear, onChange: (e) => setFYear(Number(e.target.value)), disabled: !!editKey })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0627\u0644\u0633\u0639\u0631 (\u0643\u0627\u0645 \u0648\u062D\u062F\u0629 \u0645\u0646 \u0627\u0644\u0639\u0645\u0644\u0629 = 1 \u062F\u0648\u0644\u0627\u0631) *") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { required: true, type: "number", step: "0.000001", min: "0.000001", className: `${import_ui.input} tabular`, style: import_ui.inputStyle, value: fRate, onChange: (e) => setFRate(e.target.value), placeholder: t("\u0645\u062B\u0627\u0644: 50.25") })
      ] }),
      info && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-sm", style: { color: "var(--color-primary)" }, children: info }),
      error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-sm", style: { color: "var(--color-danger)" }, children: error }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex gap-2 pt-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", disabled: saving, className: import_ui.btnPrimary, style: import_ui.btnPrimaryStyle, children: saving ? t("...\u062C\u0627\u0631\u064A \u0627\u0644\u062D\u0641\u0638") : t("\u062D\u0641\u0638") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => setShowForm(false), className: import_ui.btnSecondary, style: import_ui.btnSecondaryStyle, children: t("\u0625\u0644\u063A\u0627\u0621") })
      ] })
    ] }) })
  ] });
}
__name(FxRatesList, "FxRatesList");

});
