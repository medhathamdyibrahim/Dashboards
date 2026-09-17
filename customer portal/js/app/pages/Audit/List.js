// pages/Audit/List.js — compiled from src/pages/Audit/List.tsx (readable, unminified)
__modules__.define("pages/Audit/List", function (module, exports, require) {
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
var List_exports = {};
__export(List_exports, {
  default: () => AuditList
});
module.exports = __toCommonJS(List_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_react = require("react");
var import_AuthContext = require("../../context/AuthContext");
var import_LanguageContext = require("../../context/LanguageContext");
var import_ui = require("../../lib/ui");
var import_audit = require("../../lib/audit");
const PAGE_SIZE = 25;
function StatusBadge({ action }) {
  const colors = {
    INSERT: { bg: "var(--color-success-soft, #dcfce7)", fg: "var(--color-success, #16a34a)" },
    UPDATE: { bg: "var(--color-accent-soft)", fg: "var(--color-primary-dark)" },
    DELETE: { bg: "var(--color-danger-soft)", fg: "var(--color-danger)" }
  };
  const c = colors[action] || colors.UPDATE;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold", style: { background: c.bg, color: c.fg }, children: (0, import_audit.actionLabel)(action) });
}
__name(StatusBadge, "StatusBadge");
function DiffView({ table, oldData, newData }) {
  const oldD = (0, import_audit.decryptSnapshot)(table, oldData) || {};
  const newD = (0, import_audit.decryptSnapshot)(table, newData) || {};
  const keys = Array.from(/* @__PURE__ */ new Set([...Object.keys(oldD), ...Object.keys(newD)])).filter(
    (k) => !["id", "created_at", "updated_at"].includes(k)
  );
  const changed = keys.filter((k) => JSON.stringify(oldD[k]) !== JSON.stringify(newD[k]));
  const toShow = changed.length ? changed : keys;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "w-full text-xs", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { style: { color: "var(--color-ink-soft)" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "text-start py-1 pe-3", children: "\u0627\u0644\u062D\u0642\u0644" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "text-start py-1 pe-3", children: "\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0633\u0627\u0628\u0642\u0629" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "text-start py-1", children: "\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u062C\u062F\u064A\u062F\u0629" })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: toShow.map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: "border-t", style: { borderColor: "var(--color-border)" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "py-1 pe-3 font-mono", children: k }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "py-1 pe-3", style: { color: "var(--color-danger)" }, children: formatVal(oldD[k]) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "py-1", style: { color: "var(--color-success, #16a34a)" }, children: formatVal(newD[k]) })
    ] }, k)) })
  ] });
}
__name(DiffView, "DiffView");
function formatVal(v) {
  if (v === null || v === void 0) return "\u2014";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
__name(formatVal, "formatVal");
function AuditList() {
  const { isAdmin } = (0, import_AuthContext.useAuth)();
  const { t } = (0, import_LanguageContext.useLanguage)();
  const [rows, setRows] = (0, import_react.useState)([]);
  const [count, setCount] = (0, import_react.useState)(0);
  const [page, setPage] = (0, import_react.useState)(0);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [tableFilter, setTableFilter] = (0, import_react.useState)("");
  const [actionFilter, setActionFilter] = (0, import_react.useState)("");
  const [from, setFrom] = (0, import_react.useState)("");
  const [to, setTo] = (0, import_react.useState)("");
  const [expanded, setExpanded] = (0, import_react.useState)(null);
  const [restoring, setRestoring] = (0, import_react.useState)(null);
  const [msg, setMsg] = (0, import_react.useState)(null);
  async function load() {
    setLoading(true);
    const { data, count: c } = await (0, import_audit.fetchAuditLog)({
      table: tableFilter || void 0,
      action: actionFilter || void 0,
      from: from ? `${from}T00:00:00` : void 0,
      to: to ? `${to}T23:59:59` : void 0,
      page,
      pageSize: PAGE_SIZE
    });
    setRows(data);
    setCount(c);
    setLoading(false);
  }
  __name(load, "load");
  (0, import_react.useEffect)(() => {
    load();
  }, [page, tableFilter, actionFilter, from, to]);
  if (!isAdmin) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "rounded-2xl border p-6 text-sm", style: { background: "var(--color-danger-soft)", borderColor: "var(--color-border)", color: "var(--color-danger)" }, children: t("\u0647\u0630\u0647 \u0627\u0644\u0634\u0627\u0634\u0629 \u0645\u062A\u0627\u062D\u0629 \u0644\u0644\u0623\u062F\u0645\u0646 \u0641\u0642\u0637.") });
  }
  async function handleRestore(entry) {
    if (!confirm(t("\u062A\u0623\u0643\u064A\u062F \u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0647\u0630\u0647 \u0627\u0644\u0646\u0633\u062E\u0629\u061F \u0633\u064A\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0647\u0630\u0627 \u0627\u0644\u0625\u062C\u0631\u0627\u0621 \u0646\u0641\u0633\u0647 \u0643\u062A\u0639\u062F\u064A\u0644 \u062C\u062F\u064A\u062F \u0641\u064A \u0633\u062C\u0644 \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629."))) return;
    setRestoring(entry.id);
    setMsg(null);
    const { error } = await (0, import_audit.restoreAuditEntry)(entry);
    setRestoring(null);
    if (error) setMsg(`\u274C ${error}`);
    else {
      setMsg("\u2705 " + t("\u062A\u0645\u062A \u0627\u0644\u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0628\u0646\u062C\u0627\u062D."));
      load();
    }
  }
  __name(handleRestore, "handleRestore");
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-5", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex items-center justify-between flex-wrap gap-3", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "font-display font-extrabold text-2xl", children: t("\u0633\u062C\u0644 \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629 (Audit Trail)") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-xs mt-1", style: { color: "var(--color-ink-soft)" }, children: t("\u0643\u0644 \u0639\u0645\u0644\u064A\u0629 \u0625\u0646\u0634\u0627\u0621/\u062A\u0639\u062F\u064A\u0644/\u062D\u0630\u0641 \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645\u060C \u0645\u0639 \u0625\u0645\u0643\u0627\u0646\u064A\u0629 \u0627\u0644\u0627\u0633\u062A\u0639\u0627\u062F\u0629 (Rollback).") })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-wrap gap-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { className: import_ui.input, style: { ...import_ui.inputStyle, width: "auto" }, value: tableFilter, onChange: (e) => {
        setPage(0);
        setTableFilter(e.target.value);
      }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: t("\u0643\u0644 \u0627\u0644\u062C\u062F\u0627\u0648\u0644") }),
        import_audit.AUDITED_TABLES.map((tb) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: tb, children: t(import_audit.TABLE_LABELS[tb]) }, tb))
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { className: import_ui.input, style: { ...import_ui.inputStyle, width: "auto" }, value: actionFilter, onChange: (e) => {
        setPage(0);
        setActionFilter(e.target.value);
      }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: t("\u0643\u0644 \u0627\u0644\u0625\u062C\u0631\u0627\u0621\u0627\u062A") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "INSERT", children: t("\u0625\u0646\u0634\u0627\u0621") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "UPDATE", children: t("\u062A\u0639\u062F\u064A\u0644") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "DELETE", children: t("\u062D\u0630\u0641") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "date", className: import_ui.input, style: { ...import_ui.inputStyle, width: "auto" }, value: from, onChange: (e) => {
        setPage(0);
        setFrom(e.target.value);
      } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "date", className: import_ui.input, style: { ...import_ui.inputStyle, width: "auto" }, value: to, onChange: (e) => {
        setPage(0);
        setTo(e.target.value);
      } })
    ] }),
    msg && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-sm", children: msg }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `${import_ui.card} overflow-hidden`, style: import_ui.cardStyle, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "w-full", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u062A\u0627\u0631\u064A\u062E \u0648\u0627\u0644\u0648\u0642\u062A") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u062C\u062F\u0648\u0644") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u0625\u062C\u0631\u0627\u0621") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0628\u0648\u0627\u0633\u0637\u0629") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { colSpan: 5, className: "px-3 py-8 text-center text-sm", style: { color: "var(--color-ink-soft)" }, children: t("...\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644") }) }) : rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { colSpan: 5, className: "px-3 py-8 text-center text-sm", style: { color: "var(--color-ink-soft)" }, children: t("\u0644\u0627 \u062A\u0648\u062C\u062F \u0633\u062C\u0644\u0627\u062A") }) }) : rows.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: "border-t hover:bg-[var(--color-bg)] cursor-pointer", style: { borderColor: "var(--color-border)" }, onClick: () => setExpanded(expanded === r.id ? null : r.id), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} tabular`, children: new Date(r.changed_at).toLocaleString("ar-EG") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: import_ui.td, children: t(import_audit.TABLE_LABELS[r.table_name] || r.table_name) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: import_ui.td, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { action: r.action }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: import_ui.td, children: r.profiles?.full_name || r.profiles?.email || "\u2014" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: import_ui.td, children: r.action !== "INSERT" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              className: import_ui.btnSecondary,
              style: { ...import_ui.btnSecondaryStyle, padding: "4px 10px", fontSize: "12px" },
              disabled: restoring === r.id,
              onClick: (e) => {
                e.stopPropagation();
                handleRestore(r);
              },
              children: restoring === r.id ? t("...\u062C\u0627\u0631\u064A \u0627\u0644\u0627\u0633\u062A\u0639\u0627\u062F\u0629") : t("\u0627\u0633\u062A\u0639\u0627\u062F\u0629")
            }
          ) })
        ] }),
        expanded === r.id && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { className: "border-t", style: { borderColor: "var(--color-border)", background: "var(--color-bg)" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { colSpan: 5, className: "px-4 py-3", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DiffView, { table: r.table_name, oldData: r.old_data, newData: r.new_data }) }) })
      ] }, r.id)) })
    ] }) }),
    totalPages > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-center gap-2 text-sm", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: import_ui.btnSecondary, style: import_ui.btnSecondaryStyle, disabled: page === 0, onClick: () => setPage((p) => p - 1), children: [
        "\u2039 ",
        t("\u0627\u0644\u0633\u0627\u0628\u0642")
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { color: "var(--color-ink-soft)" }, children: [
        page + 1,
        " / ",
        totalPages
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: import_ui.btnPrimary, style: import_ui.btnPrimaryStyle, disabled: page >= totalPages - 1, onClick: () => setPage((p) => p + 1), children: [
        t("\u0627\u0644\u062A\u0627\u0644\u064A"),
        " \u203A"
      ] })
    ] })
  ] });
}
__name(AuditList, "AuditList");

});
