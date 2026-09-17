// pages/Reports.js — compiled from src/pages/Reports.tsx (readable, unminified)
__modules__.define("pages/Reports", function (module, exports, require) {
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
var Reports_exports = {};
__export(Reports_exports, {
  default: () => Reports
});
module.exports = __toCommonJS(Reports_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_react = require("react");
var import_AuthContext = require("../context/AuthContext");
var import_LanguageContext = require("../context/LanguageContext");
var import_customerReport = require("../lib/customerReport");
var import_customerReportExcel = require("../lib/customerReportExcel");
var import_format = require("../lib/format");
var import_supabaseClient = require("../lib/supabaseClient");
var import_ui = require("../lib/ui");
var import_CollapsibleSection = __toESM(require("../components/CollapsibleSection"));
var import_StatusPill = __toESM(require("../components/StatusPill"));
const DATE_FIELDS = [
  { value: "po_date", label: "\u062A\u0627\u0631\u064A\u062E PO" },
  { value: "so_date", label: "\u062A\u0627\u0631\u064A\u062E SO" },
  { value: "invoice_date", label: "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629" }
];
function newDateLayer() {
  return { id: `${Date.now()}-${Math.random()}`, field: "po_date", from: null, to: null };
}
__name(newDateLayer, "newDateLayer");
function Reports() {
  const { canSeeRegion, allRegions, myRegions, isAdmin } = (0, import_AuthContext.useAuth)();
  const { t } = (0, import_LanguageContext.useLanguage)();
  const [tree, setTree] = (0, import_react.useState)([]);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [exporting, setExporting] = (0, import_react.useState)(false);
  const [allRegionNames, setAllRegionNames] = (0, import_react.useState)([]);
  const [expanded, setExpanded] = (0, import_react.useState)(/* @__PURE__ */ new Set());
  const [search, setSearch] = (0, import_react.useState)("");
  const [regionFilter, setRegionFilter] = (0, import_react.useState)([]);
  const [owner, setOwner] = (0, import_react.useState)("");
  const [dateRanges, setDateRanges] = (0, import_react.useState)([]);
  const [sortBy, setSortBy] = (0, import_react.useState)("name");
  const [sortDir, setSortDir] = (0, import_react.useState)("asc");
  (0, import_react.useEffect)(() => {
    async function load() {
      setLoading(true);
      const [t2, r] = await Promise.all([(0, import_customerReport.buildCustomerReportTree)(), import_supabaseClient.supabase.from("regions").select("name").order("name")]);
      setTree(t2);
      setAllRegionNames((r.data || []).map((x) => x.name));
      setLoading(false);
    }
    __name(load, "load");
    load();
  }, []);
  const selectableRegions = allRegions ? allRegionNames : allRegionNames.filter((r) => myRegions.includes(r));
  const owners = (0, import_react.useMemo)(() => Array.from(new Set(tree.map((c) => c.owner_name).filter(Boolean))), [tree]);
  const filters = {
    search,
    regions: regionFilter,
    owner,
    dateRanges,
    sortBy,
    sortDir
  };
  const filtered = (0, import_react.useMemo)(() => (0, import_customerReport.filterAndSortReport)(tree, filters, canSeeRegion), [tree, search, regionFilter, owner, dateRanges, sortBy, sortDir, canSeeRegion]);
  function toggleRegion(r) {
    setRegionFilter((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  }
  __name(toggleRegion, "toggleRegion");
  function addDateLayer() {
    setDateRanges((prev) => [...prev, newDateLayer()]);
  }
  __name(addDateLayer, "addDateLayer");
  function removeDateLayer(id) {
    setDateRanges((prev) => prev.filter((l) => l.id !== id));
  }
  __name(removeDateLayer, "removeDateLayer");
  function updateDateLayer(id, patch) {
    setDateRanges((prev) => prev.map((l) => l.id === id ? { ...l, ...patch } : l));
  }
  __name(updateDateLayer, "updateDateLayer");
  function toggleExpand(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  __name(toggleExpand, "toggleExpand");
  async function exportFiltered() {
    if (filtered.length === 0) {
      alert(t("\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u062A\u0637\u0627\u0628\u0642 \u0627\u0644\u0641\u0644\u0627\u062A\u0631 \u0627\u0644\u062D\u0627\u0644\u064A\u0629"));
      return;
    }
    setExporting(true);
    try {
      const blob = await (0, import_customerReportExcel.buildCustomerReportWorkbook)(filtered);
      const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      (0, import_customerReportExcel.downloadBlob)(blob, `customer-report-${stamp}.xlsx`);
    } catch (err) {
      alert(t("\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u062A\u0635\u062F\u064A\u0631: ") + err.message);
    } finally {
      setExporting(false);
    }
  }
  __name(exportFiltered, "exportFiltered");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-5", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between flex-wrap gap-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "font-display font-extrabold text-2xl", children: t("\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u0639\u0645\u0644\u0627\u0621") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: exportFiltered, disabled: exporting || loading, className: import_ui.btnPrimary, style: import_ui.btnPrimaryStyle, children: exporting ? t("...\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u0635\u062F\u064A\u0631") : `\u2B73 ${t("\u062A\u0635\u062F\u064A\u0631 Excel (\u0634\u064A\u062A \u0644\u0643\u0644 \u0639\u0645\u064A\u0644)")} \u2014 ${filtered.length}` })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `${import_ui.card} p-4 space-y-3`, style: import_ui.cardStyle, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid md:grid-cols-3 gap-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0628\u062D\u062B \u0628\u0627\u0644\u0639\u0645\u064A\u0644") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: import_ui.input, style: import_ui.inputStyle, placeholder: t("\u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u064A\u0644\u060C \u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0645\u062E\u062A\u0635\u0631\u060C \u0623\u0648 \u0643\u0648\u062F SAP..."), value: search, onChange: (e) => setSearch(e.target.value) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("Owner") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { className: import_ui.input, style: import_ui.inputStyle, value: owner, onChange: (e) => setOwner(e.target.value), children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: t("\u0627\u0644\u0643\u0644") }),
            owners.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: o, children: o }, o))
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0627\u0644\u062A\u0631\u062A\u064A\u0628") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { className: import_ui.input, style: import_ui.inputStyle, value: sortBy, onChange: (e) => setSortBy(e.target.value), children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "name", children: t("\u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u064A\u0644") }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "region", children: t("\u0627\u0644\u0645\u0646\u0637\u0642\u0629") }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "invoiced", children: t("\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631") }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "outstanding", children: t("\u0627\u0644\u0645\u062A\u0628\u0642\u064A") })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => setSortDir((d) => d === "asc" ? "desc" : "asc"), className: import_ui.btnSecondary, style: { ...import_ui.btnSecondaryStyle, padding: "4px 12px" }, children: sortDir === "asc" ? "\u2191" : "\u2193" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0627\u0644\u0645\u0646\u0637\u0642\u0629 (Region) \u2014 \u0627\u062E\u062A\u0631 \u0648\u0627\u062D\u062F\u0629 \u0623\u0648 \u0623\u0643\u062A\u0631\u060C \u0641\u0627\u0636\u064A = \u0627\u0644\u0643\u0644") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-wrap gap-2", children: [
          selectableRegions.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              onClick: () => toggleRegion(r),
              className: "text-xs font-semibold px-3 py-1.5 rounded-full border",
              style: { borderColor: "var(--color-border)", background: regionFilter.includes(r) ? "var(--color-primary-soft)" : "transparent", color: regionFilter.includes(r) ? "var(--color-primary-dark)" : "var(--color-ink-soft)" },
              children: r
            },
            r
          )),
          selectableRegions.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs", style: { color: "var(--color-ink-soft)" }, children: t("\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0646\u0627\u0637\u0642 \u0645\u062A\u0627\u062D\u0629") })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0637\u0628\u0642\u0627\u062A \u0641\u0644\u062A\u0631\u0629 \u0625\u0636\u0627\u0641\u064A\u0629 \u0628\u0627\u0644\u062A\u0627\u0631\u064A\u062E (Extra filtering layers)") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "button", onClick: addDateLayer, className: import_ui.btnSecondary, style: { ...import_ui.btnSecondaryStyle, padding: "3px 10px", fontSize: 12 }, children: [
            "+ ",
            t("\u0625\u0636\u0627\u0641\u0629 \u0637\u0628\u0642\u0629 \u0641\u0644\u062A\u0631\u0629")
          ] })
        ] }),
        dateRanges.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-xs mt-1", style: { color: "var(--color-ink-soft)" }, children: t('\u0645\u062B\u0627\u0644: \u062A\u0642\u062F\u0631 \u062A\u0636\u064A\u0641 \u0637\u0628\u0642\u0629 "\u062A\u0627\u0631\u064A\u062E PO" \u0644\u0645\u062F\u0629 \u0645\u0639\u064A\u0646\u0629 + \u0637\u0628\u0642\u0629 \u062A\u0627\u0646\u064A\u0629 "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629" \u0644\u0634\u0647\u0631 \u0645\u062E\u062A\u0644\u0641 \u2014 \u0627\u0644\u0639\u0645\u064A\u0644 \u0644\u0627\u0632\u0645 \u064A\u062D\u0642\u0642 \u0627\u0644\u0637\u0628\u0642\u062A\u064A\u0646 \u0645\u0639 \u0628\u0639\u0636.') }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "space-y-2 mt-2", children: dateRanges.map((layer) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end rounded-lg border p-2", style: { borderColor: "var(--color-border)" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0627\u0644\u0641\u0644\u062A\u0631 \u0639\u0644\u0649") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", { className: import_ui.input, style: import_ui.inputStyle, value: layer.field, onChange: (e) => updateDateLayer(layer.id, { field: e.target.value }), children: DATE_FIELDS.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: f.value, children: t(f.label) }, f.value)) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0645\u0646 \u062A\u0627\u0631\u064A\u062E") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "date", className: import_ui.input, style: import_ui.inputStyle, value: layer.from || "", onChange: (e) => updateDateLayer(layer.id, { from: e.target.value || null }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0625\u0644\u0649 \u062A\u0627\u0631\u064A\u062E") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "date", className: import_ui.input, style: import_ui.inputStyle, value: layer.to || "", onChange: (e) => updateDateLayer(layer.id, { to: e.target.value || null }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => removeDateLayer(layer.id), className: "text-sm px-2 py-2", style: { color: "var(--color-danger)" }, children: "\u2715" })
        ] }, layer.id)) })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `${import_ui.card} overflow-hidden overflow-x-auto`, style: import_ui.cardStyle, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "w-full", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u0639\u0645\u064A\u0644") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u0645\u0646\u0637\u0642\u0629") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("Owner") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("POs") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0625\u062C\u0645\u0627\u0644\u064A PO") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0625\u062C\u0645\u0627\u0644\u064A SO") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u0645\u062D\u0635\u0651\u0644") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u0645\u062A\u0628\u0642\u064A") })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { colSpan: 10, className: "px-3 py-8 text-center text-sm", style: { color: "var(--color-ink-soft)" }, children: t("...\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644") }) }) : filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { colSpan: 10, className: "px-3 py-8 text-center text-sm", style: { color: "var(--color-ink-soft)" }, children: t("\u0644\u0627 \u062A\u0648\u062C\u062F \u0646\u062A\u0627\u0626\u062C \u0645\u0637\u0627\u0628\u0642\u0629") }) }) : filtered.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: "border-t hover:bg-[var(--color-bg)] cursor-pointer", style: { borderColor: "var(--color-border)" }, onClick: () => toggleExpand(c.customer_id), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: import_ui.td, children: expanded.has(c.customer_id) ? "\u25BE" : "\u25B8" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} font-semibold`, children: c.customer_name }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: import_ui.td, children: c.region || "\u2014" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: import_ui.td, children: c.owner_name || "\u2014" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} tabular`, children: c.totals.poCount }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} tabular`, children: (0, import_format.money)(c.totals.poValue, "USD") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} tabular`, children: (0, import_format.money)(c.totals.soValue, "USD") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} tabular font-medium`, children: (0, import_format.money)(c.totals.invoicedValue, "USD") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} tabular`, style: { color: "var(--color-primary)" }, children: (0, import_format.money)(c.totals.collectedValue, "USD") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} tabular`, style: { color: c.totals.outstanding > 0 ? "var(--color-danger)" : "var(--color-ink-soft)" }, children: (0, import_format.money)(c.totals.outstanding, "USD") })
        ] }, c.customer_id),
        expanded.has(c.customer_id) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { colSpan: 10, className: "px-4 pb-4 pt-1", style: { background: "var(--color-surface-2)" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "space-y-2", children: c.purchase_orders.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-xs", style: { color: "var(--color-ink-soft)" }, children: t("\u0644\u0627 \u064A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A PO \u0644\u0647\u0630\u0627 \u0627\u0644\u0639\u0645\u064A\u0644") }) : c.purchase_orders.map((po) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_CollapsibleSection.default, { title: `PO ${po.po_number} \u2014 ${po.item_name || ""} (${(0, import_format.money)(po.value, po.currency || "USD")})`, defaultOpen: false, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "space-y-2 ps-4", children: po.sales_orders.map((so) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "text-xs border-s-2 ps-3", style: { borderColor: "var(--color-border)" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "font-semibold", children: [
            t("SO"),
            ": ",
            so.sap_so_number || so.so_number,
            " \u2014 ",
            so.product_description,
            " (",
            (0, import_format.money)(so.value, so.currency || "USD"),
            ")"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "mt-1 flex flex-wrap gap-3", style: { color: "var(--color-ink-soft)" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
              t("\u0634\u062D\u0646\u0627\u062A"),
              ": ",
              so.dispatches.length
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
              t("\u0641\u0648\u0627\u062A\u064A\u0631"),
              ": ",
              so.invoices.length
            ] }),
            so.invoices.map((inv) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "inline-flex items-center gap-1", children: [
              inv.invoice_number,
              " ",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_StatusPill.default, { status: inv.status || "draft" })
            ] }, inv.id))
          ] })
        ] }, so.id)) }) }, po.id)) }) }) })
      ] })) })
    ] }) }),
    !isAdmin && !allRegions && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-xs", style: { color: "var(--color-ink-soft)" }, children: t("\u0627\u0644\u062A\u0642\u0631\u064A\u0631 \u062F\u0647 \u0628\u064A\u0639\u0631\u0636 \u0628\u0633 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0641\u064A \u0627\u0644\u0645\u0646\u0627\u0637\u0642 \u0627\u0644\u0644\u064A \u0644\u064A\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u0639\u0644\u064A\u0647\u0627.") })
  ] });
}
__name(Reports, "Reports");

});
