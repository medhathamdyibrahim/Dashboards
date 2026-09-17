// pages/Collections/List.js — compiled from src/pages/Collections/List.tsx (readable, unminified)
__modules__.define("pages/Collections/List", function (module, exports, require) {
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
  default: () => CollectionsList
});
module.exports = __toCommonJS(List_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_react = require("react");
var import_react_router_dom = require("react-router-dom");
var import_AuthContext = require("../../context/AuthContext");
var import_LanguageContext = require("../../context/LanguageContext");
var import_queries = require("../../lib/repository/queries");
var import_mutations = require("../../lib/repository/mutations");
var import_importExcel = require("../../lib/importExcel");
var import_secureClient = require("../../lib/secureClient");
var import_format = require("../../lib/format");
var import_ui = require("../../lib/ui");
var import_Modal = __toESM(require("../../components/Modal"));
var import_ImportButton = __toESM(require("../../components/ImportButton"));
var import_AgingImportModal = __toESM(require("../../components/AgingImportModal"));
var import_SearchableInvoiceSelect = __toESM(require("../../components/SearchableInvoiceSelect"));
var import_PaginationFooter = __toESM(require("../../components/PaginationFooter"));
var import_usePaginatedList = require("../../lib/usePaginatedList");
function CollectionsList() {
  const { can, userId, canSeeRegion } = (0, import_AuthContext.useAuth)();
  const { t } = (0, import_LanguageContext.useLanguage)();
  const [customers, setCustomers] = (0, import_react.useState)([]);
  const [showRecord, setShowRecord] = (0, import_react.useState)(false);
  const [showImport, setShowImport] = (0, import_react.useState)(false);
  const [customerId, setCustomerId] = (0, import_react.useState)("");
  const [invoiceId, setInvoiceId] = (0, import_react.useState)("");
  const [invoiceRow, setInvoiceRow] = (0, import_react.useState)(null);
  const [amount, setAmount] = (0, import_react.useState)("");
  const [payDate, setPayDate] = (0, import_react.useState)((/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
  const [reference, setReference] = (0, import_react.useState)("");
  const [saving, setSaving] = (0, import_react.useState)(false);
  const [formError, setFormError] = (0, import_react.useState)(null);
  const { rows, loading, page, setPage, search, setSearch, totalCount, totalPages, refresh } = (0, import_usePaginatedList.usePaginatedList)({
    view: "v_collections_list",
    searchColumns: ["invoice_number", "customer_name", "reference_no"],
    orderColumn: "created_at",
    fetchFn: /* @__PURE__ */ __name((p) => (0, import_queries.listCollections)({ search: p.search, limit: p.limit, offset: p.offset }), "fetchFn")
  });
  const visibleRows = rows.filter((r) => canSeeRegion(r.region));
  (0, import_react.useEffect)(() => {
    if (!showRecord || customers.length) return;
    (0, import_secureClient.secureFrom)("customers").select("*").order("name").then(({ data }) => setCustomers(data || []));
  }, [showRecord, customers.length]);
  function openRecord() {
    setCustomerId("");
    setInvoiceId("");
    setInvoiceRow(null);
    setAmount("");
    setPayDate((/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
    setReference("");
    setFormError(null);
    setShowRecord(true);
  }
  __name(openRecord, "openRecord");
  function handleInvoiceChange(id, row) {
    setInvoiceId(id);
    setInvoiceRow(row);
    if (row) {
      setCustomerId(row.customer_id);
      setAmount(String(row.balance_due));
    }
  }
  __name(handleInvoiceChange, "handleInvoiceChange");
  function handleCustomerChange(id) {
    setCustomerId(id);
    if (invoiceRow && invoiceRow.customer_id !== id) {
      setInvoiceId("");
      setInvoiceRow(null);
      setAmount("");
    }
  }
  __name(handleCustomerChange, "handleCustomerChange");
  async function handleRecord(e) {
    e.preventDefault();
    if (!invoiceId || !invoiceRow) {
      setFormError(t("\u0627\u062E\u062A\u0631 \u0641\u0627\u062A\u0648\u0631\u0629 \u0623\u0648\u0644\u064B\u0627"));
      return;
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setFormError(t("\u0623\u062F\u062E\u0644 \u0642\u064A\u0645\u0629 \u0635\u062D\u064A\u062D\u0629"));
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      const { error } = await (0, import_mutations.createPayment)({
        invoice_id: invoiceId,
        amount: amt,
        currency: invoiceRow.currency,
        payment_date: payDate,
        reference_no: reference || null,
        created_by: userId
      });
      if (error) throw new Error(error.message || String(error));
      const newPaid = invoiceRow.balance_due - amt <= 0;
      await (0, import_secureClient.secureFrom)("invoices").update({ status: newPaid ? "paid" : "partially_paid" }).eq("id", invoiceId);
      setShowRecord(false);
      refresh();
    } catch (err) {
      setFormError(t("\u062D\u062F\u062B \u062E\u0637\u0623: ") + err.message);
    } finally {
      setSaving(false);
    }
  }
  __name(handleRecord, "handleRecord");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-5", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between flex-wrap gap-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "font-display font-extrabold text-2xl", children: t("\u0627\u0644\u062A\u062D\u0635\u064A\u0644\u0627\u062A (Collections)") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex gap-2 flex-wrap", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          import_ImportButton.default,
          {
            label: t("\u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0645\u0646 Excel"),
            sheetName: "Collections",
            columns: ["Customer Name", "Invoice Number", "Collected Amount", "Collection Date"],
            onImport: import_importExcel.importCollections,
            onDone: refresh
          }
        ),
        can("payments", "create") && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => setShowImport(true), className: import_ui.btnSecondary, style: import_ui.btnSecondaryStyle, children: [
          "\u2B06 ",
          t("\u0627\u0633\u062A\u064A\u0631\u0627\u062F \u062A\u0642\u0631\u064A\u0631 \u0623\u0639\u0645\u0627\u0631 \u0627\u0644\u0639\u0645\u0644\u0627\u0621")
        ] }),
        can("payments", "create") && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: openRecord, className: import_ui.btnPrimary, style: import_ui.btnPrimaryStyle, children: [
          "+ ",
          t("\u062A\u0633\u062C\u064A\u0644 \u062A\u062D\u0635\u064A\u0644")
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "input",
      {
        className: `${import_ui.input} max-w-xs`,
        style: import_ui.inputStyle,
        placeholder: t("\u0628\u062D\u062B \u0628\u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0623\u0648 \u0627\u0644\u0639\u0645\u064A\u0644..."),
        value: search,
        onChange: (e) => setSearch(e.target.value)
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `${import_ui.card} overflow-hidden`, style: import_ui.cardStyle, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "w-full", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u062A\u0627\u0631\u064A\u062E") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u0639\u0645\u064A\u0644") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u0645\u0646\u0637\u0642\u0629") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u0642\u064A\u0645\u0629") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0645\u0631\u062C\u0639") })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { colSpan: 6, className: "px-3 py-8 text-center text-sm", style: { color: "var(--color-ink-soft)" }, children: t("...\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644") }) }) : visibleRows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { colSpan: 6, className: "px-3 py-8 text-center text-sm", style: { color: "var(--color-ink-soft)" }, children: t("\u0644\u0627 \u062A\u0648\u062C\u062F \u062A\u062D\u0635\u064A\u0644\u0627\u062A \u0645\u0633\u062C\u0644\u0629 \u0628\u0639\u062F.") }) }) : visibleRows.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: "border-t hover:bg-[var(--color-bg)]", style: { borderColor: "var(--color-border)" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} tabular`, children: (0, import_format.dateAr)(p.payment_date) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: import_ui.td, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.Link, { to: "/invoices", className: "font-semibold hover:underline", style: { color: "var(--color-primary-dark)" }, children: p.invoice_number }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: import_ui.td, children: p.customer_name }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: import_ui.td, children: p.region || "\u2014" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} tabular font-medium`, style: { color: "var(--color-primary)" }, children: (0, import_format.money)(p.amount, "USD") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: import_ui.td, children: p.reference_no || "\u2014" })
        ] }, p.id)) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_PaginationFooter.default, { page, totalPages, totalCount, onPageChange: setPage })
    ] }),
    showRecord && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_Modal.default, { title: t("\u062A\u0633\u062C\u064A\u0644 \u062A\u062D\u0635\u064A\u0644"), onClose: () => setShowRecord(false), children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: handleRecord, className: "space-y-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0627\u0644\u0639\u0645\u064A\u0644") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { className: import_ui.input, style: import_ui.inputStyle, value: customerId, onChange: (e) => handleCustomerChange(e.target.value), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: t("\u0643\u0644 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u2014 \u0623\u0648 \u062F\u0648\u0651\u0631 \u0628\u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0628\u0627\u0634\u0631\u0629") }),
          customers.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: c.id, children: c.name }, c.id))
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 *") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_SearchableInvoiceSelect.default, { value: invoiceId, onChange: handleInvoiceChange, customerId: customerId || void 0 })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0627\u0644\u0642\u064A\u0645\u0629 *") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { required: true, type: "number", step: "0.01", min: "0.01", className: `${import_ui.input} tabular`, style: import_ui.inputStyle, value: amount, onChange: (e) => setAmount(e.target.value) }),
        invoiceRow && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "text-xs mt-1", style: { color: "var(--color-ink-soft)" }, children: [
          t("\u0627\u0644\u0645\u062A\u0628\u0642\u064A:"),
          " ",
          (0, import_format.money)(invoiceRow.balance_due, invoiceRow.currency)
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u062A\u062D\u0635\u064A\u0644") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "date", className: import_ui.input, style: import_ui.inputStyle, value: payDate, onChange: (e) => setPayDate(e.target.value) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0631\u0642\u0645 \u0645\u0631\u062C\u0639\u064A") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: import_ui.input, style: import_ui.inputStyle, value: reference, onChange: (e) => setReference(e.target.value), placeholder: t("\u0631\u0642\u0645 \u0627\u0644\u0634\u064A\u0643 / \u0627\u0644\u062A\u062D\u0648\u064A\u0644...") })
      ] }),
      formError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-sm", style: { color: "var(--color-danger)" }, children: formError }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex gap-2 pt-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", disabled: saving, className: import_ui.btnPrimary, style: import_ui.btnPrimaryStyle, children: saving ? t("...\u062C\u0627\u0631\u064A \u0627\u0644\u062D\u0641\u0638") : t("\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u0641\u0639\u0629") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => setShowRecord(false), className: import_ui.btnSecondary, style: import_ui.btnSecondaryStyle, children: t("\u0625\u0644\u063A\u0627\u0621") })
      ] })
    ] }) }),
    showImport && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_AgingImportModal.default, { onClose: () => setShowImport(false), onApplied: refresh })
  ] });
}
__name(CollectionsList, "CollectionsList");

});
