// pages/Invoices/List.js — compiled from src/pages/Invoices/List.tsx (readable, unminified)
__modules__.define("pages/Invoices/List", function (module, exports, require) {
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
  default: () => InvoicesList
});
module.exports = __toCommonJS(List_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_react = require("react");
var import_react_router_dom = require("react-router-dom");
var import_supabaseClient = require("../../lib/supabaseClient");
var import_AuthContext = require("../../context/AuthContext");
var import_LanguageContext = require("../../context/LanguageContext");
var import_StatusPill = __toESM(require("../../components/StatusPill"));
var import_ImportButton = __toESM(require("../../components/ImportButton"));
var import_PaginationFooter = __toESM(require("../../components/PaginationFooter"));
var import_usePaginatedList = require("../../lib/usePaginatedList");
var import_queries = require("../../lib/repository/queries");
var import_mutations = require("../../lib/repository/mutations");
var import_importExcel = require("../../lib/importExcel");
var import_format = require("../../lib/format");
var import_exportExcel = require("../../lib/exportExcel");
var import_ui = require("../../lib/ui");
function InvoicesList() {
  const { can, canSeeRegion } = (0, import_AuthContext.useAuth)();
  const { t } = (0, import_LanguageContext.useLanguage)();
  const navigate = (0, import_react_router_dom.useNavigate)();
  const [statusFilter, setStatusFilter] = (0, import_react.useState)("");
  const { rows, loading, page, setPage, search, setSearch, totalCount, grandTotal, totalPages, refresh } = (0, import_usePaginatedList.usePaginatedList)({
    view: "v_invoice_list",
    searchColumns: ["invoice_number", "so_number", "customer_name"],
    orderColumn: "created_at",
    grandTotalColumn: "invoice_value",
    grandTotalCurrencyColumn: "currency",
    grandTotalDateColumn: "invoice_date",
    filters: { status: statusFilter },
    fetchFn: /* @__PURE__ */ __name((p) => (0, import_queries.listInvoices)({ search: p.search, status: p.filters.status || void 0, limit: p.limit, offset: p.offset }), "fetchFn")
  });
  async function remove(row) {
    if (!confirm(`${t("\u062D\u0630\u0641 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629")} "${row.invoice_number}"\u061F`)) return;
    await (0, import_mutations.deleteInvoice)(row.id);
    refresh();
  }
  __name(remove, "remove");
  async function approve(row) {
    await (0, import_mutations.updateInvoice)(row.id, row.so_id, { status: "issued" });
    refresh();
  }
  __name(approve, "approve");
  async function exportRows() {
    let query = import_supabaseClient.supabase.from("v_invoice_list").select("*");
    if (statusFilter) query = query.eq("status", statusFilter);
    if (search.trim()) {
      const term = search.trim().replace(/[%,]/g, "");
      query = query.or(`invoice_number.ilike.%${term}%,customer_name.ilike.%${term}%`);
    }
    const { data } = await query.order("created_at", { ascending: false });
    await (0, import_exportExcel.exportRowsToExcel)("invoices", t("\u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631"), (data || []).map((i) => ({
      [t("\u0627\u0644\u0639\u0645\u064A\u0644")]: i.customer_name || "",
      [t("\u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629")]: i.invoice_number,
      [t("SAP SO")]: i.sap_so_number || "",
      [t("\u0627\u0644\u062A\u0627\u0631\u064A\u062E")]: i.invoice_date,
      [t("\u0627\u0644\u062D\u0627\u0644\u0629")]: i.status
    })));
  }
  __name(exportRows, "exportRows");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-5", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between flex-wrap gap-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "font-display font-extrabold text-2xl", children: t("\u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 (Invoices)") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex gap-2 flex-wrap", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          import_ImportButton.default,
          {
            label: t("\u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0645\u0646 Excel"),
            sheetName: "Invoices",
            columns: ["Customer Name", "Invoice Number", "Product Description", "SAP SO", "Access SO", "Invoice Quantity", "Invoice Value", "Invoice Date"],
            onImport: import_importExcel.importInvoices,
            onDone: refresh
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: exportRows, className: import_ui.btnSecondary, style: import_ui.btnSecondaryStyle, children: [
          "\u2B73 ",
          t("\u062A\u0635\u062F\u064A\u0631 Excel")
        ] }),
        can("invoices", "create") && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react_router_dom.Link, { to: "/invoices/new", className: import_ui.btnPrimary, style: import_ui.btnPrimaryStyle, children: [
          "+ ",
          t("\u0641\u0627\u062A\u0648\u0631\u0629 \u062C\u062F\u064A\u062F\u0629")
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-3 flex-wrap", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: `${import_ui.input} max-w-xs`, style: import_ui.inputStyle, placeholder: t("\u0628\u062D\u062B \u0628\u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629\u060C SO\u060C \u0623\u0648 \u0627\u0644\u0639\u0645\u064A\u0644..."), value: search, onChange: (e) => setSearch(e.target.value) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex gap-2 flex-wrap", children: ["", "draft", "issued", "partially_paid", "paid", "overdue", "cancelled"].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          onClick: () => setStatusFilter(s),
          className: "text-xs font-semibold px-3 py-1.5 rounded-full border",
          style: { borderColor: "var(--color-border)", background: statusFilter === s ? "var(--color-primary-soft)" : "transparent", color: statusFilter === s ? "var(--color-primary-dark)" : "var(--color-ink-soft)" },
          children: s === "" ? t("\u0627\u0644\u0643\u0644") : t(s)
        },
        s || "all"
      )) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `${import_ui.card} overflow-hidden overflow-x-auto`, style: import_ui.cardStyle, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "w-full", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("SAP SO") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u0639\u0645\u064A\u0644") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u062A\u0627\u0631\u064A\u062E") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u0643\u0645\u064A\u0629") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u0642\u064A\u0645\u0629") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u0645\u062A\u0628\u0642\u064A") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u062D\u0627\u0644\u0629") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { colSpan: 9, className: "px-3 py-8 text-center text-sm", style: { color: "var(--color-ink-soft)" }, children: t("...\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644") }) }) : rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { colSpan: 9, className: "px-3 py-8 text-center text-sm", style: { color: "var(--color-ink-soft)" }, children: t("\u0644\u0627 \u062A\u0648\u062C\u062F \u0641\u0648\u0627\u062A\u064A\u0631") }) }) : rows.filter((i) => canSeeRegion(i.region)).map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: "border-t hover:bg-[var(--color-bg)] cursor-pointer", style: { borderColor: "var(--color-border)" }, onClick: () => can("invoices", "edit") && navigate(`/invoices/${i.id}/edit`), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} font-semibold`, children: i.invoice_number }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} font-mono text-xs`, children: i.sap_so_number || "\u2014" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: import_ui.td, children: i.customer_name }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} tabular`, children: (0, import_format.dateAr)(i.invoice_date) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} tabular`, children: i.invoice_quantity }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} tabular font-medium`, children: (0, import_format.money)(i.invoice_value, i.currency) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} tabular`, style: { color: i.balance_due > 0 ? "var(--color-danger)" : "var(--color-ink-soft)" }, children: (0, import_format.money)(i.balance_due, i.currency) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: import_ui.td, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_StatusPill.default, { status: i.status }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: import_ui.td, onClick: (e) => e.stopPropagation(), children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex gap-3 justify-end", children: [
            i.status === "draft" && can("invoices", "approve") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => approve(i), className: "text-xs font-semibold", style: { color: "var(--color-accent)" }, children: t("\u0627\u0639\u062A\u0645\u0627\u062F") }),
            can("invoices", "edit") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.Link, { to: `/invoices/${i.id}/edit`, className: "text-xs font-semibold", style: { color: "var(--color-primary)" }, children: t("\u062A\u0639\u062F\u064A\u0644") }),
            can("invoices", "delete") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => remove(i), className: import_ui.btnDanger, style: import_ui.btnDangerStyle, children: t("\u062D\u0630\u0641") })
          ] }) })
        ] }, i.id)) }),
        !loading && rows.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tfoot", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: "border-t-2", style: { borderColor: "var(--color-border)" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { colSpan: 5, className: `${import_ui.td} font-bold`, children: t("\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0643\u0644\u064A (Grand Total)") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} font-bold tabular`, style: { color: "var(--color-primary)" }, children: (0, import_format.money)(grandTotal, "USD") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { colSpan: 3 })
        ] }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_PaginationFooter.default, { page, totalPages, totalCount, onPageChange: setPage })
    ] })
  ] });
}
__name(InvoicesList, "InvoicesList");

});
