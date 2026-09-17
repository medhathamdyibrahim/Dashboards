// pages/Invoices/Form.js — compiled from src/pages/Invoices/Form.tsx (readable, unminified)
__modules__.define("pages/Invoices/Form", function (module, exports, require) {
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
var Form_exports = {};
__export(Form_exports, {
  default: () => InvoiceForm
});
module.exports = __toCommonJS(Form_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_react = require("react");
var import_react_router_dom = require("react-router-dom");
var import_secureClient = require("../../lib/secureClient");
var import_AuthContext = require("../../context/AuthContext");
var import_LanguageContext = require("../../context/LanguageContext");
var import_SearchableSelect = __toESM(require("../../components/SearchableSelect"));
var import_queries = require("../../lib/repository/queries");
var import_mutations = require("../../lib/repository/mutations");
var import_ui = require("../../lib/ui");
function InvoiceForm() {
  const { id } = (0, import_react_router_dom.useParams)();
  const isEdit = !!id;
  const navigate = (0, import_react_router_dom.useNavigate)();
  const { can } = (0, import_AuthContext.useAuth)();
  const { t } = (0, import_LanguageContext.useLanguage)();
  const [customers, setCustomers] = (0, import_react.useState)([]);
  const [sos, setSos] = (0, import_react.useState)([]);
  const [loading, setLoading] = (0, import_react.useState)(isEdit);
  const [saving, setSaving] = (0, import_react.useState)(false);
  const [formError, setFormError] = (0, import_react.useState)(null);
  const [originalSoId, setOriginalSoId] = (0, import_react.useState)("");
  const [form, setForm] = (0, import_react.useState)({
    customer_id: "",
    invoice_number: "",
    so_id: "",
    invoice_quantity: "",
    invoice_value: "",
    invoice_date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
  });
  (0, import_react.useEffect)(() => {
    (0, import_secureClient.secureFrom)("customers").select("*").order("name").then((res) => setCustomers(res.data || []));
  }, []);
  (0, import_react.useEffect)(() => {
    if (!form.customer_id) {
      setSos([]);
      return;
    }
    (0, import_queries.listSoSelector)(form.customer_id).then(setSos);
  }, [form.customer_id]);
  (0, import_react.useEffect)(() => {
    if (!isEdit) return;
    async function load() {
      const { data } = await (0, import_secureClient.secureFrom)("invoices").select("*").eq("id", id).single();
      if (!data) {
        navigate("/invoices");
        return;
      }
      setForm({
        customer_id: data.customer_id,
        invoice_number: data.invoice_number,
        so_id: data.so_id,
        invoice_quantity: String(data.invoice_quantity || ""),
        invoice_value: String(data.invoice_value || ""),
        invoice_date: data.invoice_date
      });
      setOriginalSoId(data.so_id);
      setLoading(false);
    }
    __name(load, "load");
    load();
  }, [id, isEdit, navigate]);
  if (isEdit && !can("invoices", "edit")) {
    navigate("/invoices");
    return null;
  }
  if (!isEdit && !can("invoices", "create")) {
    navigate("/invoices");
    return null;
  }
  async function save(e) {
    e.preventDefault();
    if (!form.customer_id) {
      setFormError(t("\u0627\u062E\u062A\u0631 \u0639\u0645\u064A\u0644"));
      return;
    }
    if (!form.so_id) {
      setFormError(t("\u0627\u062E\u062A\u0631 \u0623\u0645\u0631 \u0627\u0644\u0628\u064A\u0639 (SO)"));
      return;
    }
    if (!form.invoice_number.trim()) {
      setFormError(t("\u0623\u062F\u062E\u0644 \u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629"));
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      const payload = {
        invoice_number: form.invoice_number.trim(),
        so_id: form.so_id,
        invoice_quantity: Number(form.invoice_quantity) || 0,
        invoice_value: Number(form.invoice_value) || 0,
        invoice_date: form.invoice_date,
        status: "issued"
      };
      const { error } = isEdit ? await (0, import_mutations.updateInvoice)(id, originalSoId, payload) : await (0, import_mutations.createInvoice)(payload);
      if (error) throw new Error(error.message || String(error));
      navigate("/invoices");
    } catch (err) {
      setFormError(t("\u062D\u062F\u062B \u062E\u0637\u0623: ") + err.message);
    } finally {
      setSaving(false);
    }
  }
  __name(save, "save");
  if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "py-10 text-center text-sm", style: { color: "var(--color-ink-soft)" }, children: t("...\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644") });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-5 max-w-2xl", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => navigate("/invoices"), className: "text-sm font-semibold", style: { color: "var(--color-ink-soft)" }, children: [
      "\u2190 ",
      t("\u0631\u062C\u0648\u0639")
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "font-display font-extrabold text-2xl", children: t(isEdit ? "\u062A\u0639\u062F\u064A\u0644 \u0641\u0627\u062A\u0648\u0631\u0629" : "\u0641\u0627\u062A\u0648\u0631\u0629 \u062C\u062F\u064A\u062F\u0629") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: save, className: `${import_ui.card} p-5 space-y-3`, style: import_ui.cardStyle, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0627\u0644\u0639\u0645\u064A\u0644 *") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "select",
          {
            required: true,
            autoFocus: true,
            className: import_ui.input,
            style: import_ui.inputStyle,
            value: form.customer_id,
            onChange: (e) => setForm({ ...form, customer_id: e.target.value, so_id: "" }),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: t("\u0627\u062E\u062A\u0631 \u0639\u0645\u064A\u0644...") }),
              customers.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: c.id, children: c.name }, c.id))
            ]
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0623\u0645\u0631 \u0627\u0644\u0628\u064A\u0639 (SO) *") }),
        !form.customer_id ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { disabled: true, className: import_ui.input, style: import_ui.inputStyle, placeholder: t("\u0627\u062E\u062A\u0631 \u0639\u0645\u064A\u0644 \u0627\u0644\u0623\u0648\u0644...") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          import_SearchableSelect.default,
          {
            value: form.so_id,
            options: sos,
            getId: (s) => s.id,
            getLabel: (s) => s.sap_so_number ? `${s.sap_so_number} \u2014 ${s.so_number}` : s.so_number,
            matches: (s, q) => s.so_number.toLowerCase().includes(q) || (s.sap_so_number || "").toLowerCase().includes(q),
            onChange: (sid) => setForm({ ...form, so_id: sid }),
            placeholder: t("\u0627\u0628\u062D\u062B \u0628\u0631\u0642\u0645 SO...")
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 *") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { required: true, className: `${import_ui.input} font-mono`, style: import_ui.inputStyle, value: form.invoice_number, onChange: (e) => setForm({ ...form, invoice_number: e.target.value }), placeholder: t("\u0627\u0643\u062A\u0628 \u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629...") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-3 gap-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0627\u0644\u0643\u0645\u064A\u0629") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "number", step: "any", className: `${import_ui.input} tabular`, style: import_ui.inputStyle, value: form.invoice_quantity, onChange: (e) => setForm({ ...form, invoice_quantity: e.target.value }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0627\u0644\u0642\u064A\u0645\u0629") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "number", step: "any", className: `${import_ui.input} tabular`, style: import_ui.inputStyle, value: form.invoice_value, onChange: (e) => setForm({ ...form, invoice_value: e.target.value }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "date", className: import_ui.input, style: import_ui.inputStyle, value: form.invoice_date, onChange: (e) => setForm({ ...form, invoice_date: e.target.value }) })
        ] })
      ] }),
      formError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-sm", style: { color: "var(--color-danger)" }, children: formError }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex gap-2 pt-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", disabled: saving, className: import_ui.btnPrimary, style: import_ui.btnPrimaryStyle, children: saving ? t("...\u062C\u0627\u0631\u064A \u0627\u0644\u062D\u0641\u0638") : t("\u062D\u0641\u0638") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => navigate("/invoices"), className: import_ui.btnSecondary, style: import_ui.btnSecondaryStyle, children: t("\u0625\u0644\u063A\u0627\u0621") })
      ] })
    ] })
  ] });
}
__name(InvoiceForm, "InvoiceForm");

});
