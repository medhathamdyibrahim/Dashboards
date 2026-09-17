// components/SearchableInvoiceSelect.js — compiled from src/components/SearchableInvoiceSelect.tsx (readable, unminified)
__modules__.define("components/SearchableInvoiceSelect", function (module, exports, require) {
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
var SearchableInvoiceSelect_exports = {};
__export(SearchableInvoiceSelect_exports, {
  default: () => SearchableInvoiceSelect
});
module.exports = __toCommonJS(SearchableInvoiceSelect_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_react = require("react");
var import_LanguageContext = require("../context/LanguageContext");
var import_format = require("../lib/format");
var import_ui = require("../lib/ui");
var import_queries = require("../lib/repository/queries");
function SearchableInvoiceSelect({
  value,
  onChange,
  customerId
}) {
  const { t } = (0, import_LanguageContext.useLanguage)();
  const [rows, setRows] = (0, import_react.useState)([]);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [query, setQuery] = (0, import_react.useState)("");
  const [open, setOpen] = (0, import_react.useState)(false);
  const boxRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    let cancelled = false;
    setLoading(true);
    (0, import_queries.listOutstandingInvoices)(customerId).then((data) => {
      if (!cancelled) {
        setRows(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [customerId]);
  (0, import_react.useEffect)(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    __name(onClickOutside, "onClickOutside");
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);
  const selected = (0, import_react.useMemo)(() => rows.find((r) => r.id === value) || null, [rows, value]);
  const filtered = (0, import_react.useMemo)(() => {
    const q = query.trim().toLowerCase();
    let list = rows;
    if (q) list = list.filter((r) => r.invoice_number.toLowerCase().includes(q) || r.customer_name.toLowerCase().includes(q));
    return list.slice(0, 50);
  }, [rows, query]);
  function pick(row) {
    onChange(row.id, row);
    setQuery("");
    setOpen(false);
  }
  __name(pick, "pick");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { ref: boxRef, className: "relative", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "input",
      {
        className: import_ui.input,
        style: import_ui.inputStyle,
        placeholder: loading ? t("...\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644") : customerId ? t("\u0627\u0628\u062D\u062B \u0628\u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629...") : t("\u0627\u0628\u062D\u062B \u0628\u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0623\u0648 \u0627\u0644\u0639\u0645\u064A\u0644..."),
        value: open ? query : selected ? `${selected.invoice_number} \u2014 ${selected.customer_name}` : "",
        onFocus: () => {
          setOpen(true);
          setQuery("");
        },
        onChange: (e) => setQuery(e.target.value)
      }
    ),
    open && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute z-20 mt-1 w-full max-h-80 overflow-y-auto rounded-lg border shadow-lg", style: { background: "var(--color-surface)", borderColor: "var(--color-border)" }, children: filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "px-3 py-3 text-sm", style: { color: "var(--color-ink-soft)" }, children: t("\u0644\u0627 \u062A\u0648\u062C\u062F \u0646\u062A\u0627\u0626\u062C") }) : filtered.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "button",
      {
        type: "button",
        onClick: () => pick(r),
        className: "w-full text-start px-3 py-2 border-t first:border-t-0 hover:bg-[var(--color-bg)] transition-colors",
        style: { borderColor: "var(--color-border)" },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-semibold text-sm", children: r.invoice_number }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs", style: { color: "var(--color-ink-soft)" }, children: r.customer_name })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "text-xs mt-0.5 tabular font-medium", style: { color: "var(--color-danger)" }, children: [
            t("\u0627\u0644\u0645\u062A\u0628\u0642\u064A"),
            ": ",
            (0, import_format.money)(r.balance_due, r.currency)
          ] })
        ]
      },
      r.id
    )) })
  ] });
}
__name(SearchableInvoiceSelect, "SearchableInvoiceSelect");

});
