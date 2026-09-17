// pages/SalesOrders/Form.js — compiled from src/pages/SalesOrders/Form.tsx (readable, unminified)
__modules__.define("pages/SalesOrders/Form", function (module, exports, require) {
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
  default: () => SalesOrderForm
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
const emptyLine = /* @__PURE__ */ __name(() => ({ product_description: "", proof_number: "", version: "", so_type: "", quantity: 0, price: 0, notes: "" }), "emptyLine");
function SalesOrderForm() {
  const { id } = (0, import_react_router_dom.useParams)();
  const isEdit = !!id;
  const navigate = (0, import_react_router_dom.useNavigate)();
  const { can } = (0, import_AuthContext.useAuth)();
  const { t } = (0, import_LanguageContext.useLanguage)();
  const [customers, setCustomers] = (0, import_react.useState)([]);
  const [pos, setPos] = (0, import_react.useState)([]);
  const [poCustomerId, setPoCustomerId] = (0, import_react.useState)(null);
  const [loading, setLoading] = (0, import_react.useState)(isEdit);
  const [saving, setSaving] = (0, import_react.useState)(false);
  const [formError, setFormError] = (0, import_react.useState)(null);
  const [originalPoId, setOriginalPoId] = (0, import_react.useState)("");
  const [form, setForm] = (0, import_react.useState)({
    customer_id: "",
    po_id: "",
    sap_so_number: "",
    factory_so_number: "",
    so_date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
    notes: ""
  });
  const [lines, setLines] = (0, import_react.useState)([emptyLine()]);
  (0, import_react.useEffect)(() => {
    (0, import_secureClient.secureFrom)("customers").select("*").order("name").then((res) => setCustomers(res.data || []));
  }, []);
  (0, import_react.useEffect)(() => {
    if (!form.customer_id) {
      setPos([]);
      setPoCustomerId(null);
      return;
    }
    (0, import_queries.listPoSelector)(form.customer_id).then((rows) => {
      setPos(rows);
      setPoCustomerId(form.customer_id);
    });
  }, [form.customer_id]);
  (0, import_react.useEffect)(() => {
    if (!isEdit) return;
    async function load() {
      const { data } = await (0, import_secureClient.secureFrom)("sales_orders").select("*").eq("id", id).single();
      if (!data) {
        navigate("/sales-orders");
        return;
      }
      setForm({
        customer_id: data.customer_id,
        po_id: data.po_id,
        sap_so_number: data.sap_so_number || "",
        factory_so_number: data.factory_so_number || "",
        so_date: data.so_date,
        notes: data.notes || ""
      });
      setOriginalPoId(data.po_id);
      const items = await (0, import_mutations.listSoItems)(id);
      setLines(items.length ? items.map((i) => ({
        product_description: i.product_description,
        proof_number: i.proof_number,
        version: i.version,
        so_type: i.so_type,
        quantity: i.quantity,
        price: i.price,
        notes: i.notes
      })) : [emptyLine()]);
      setLoading(false);
    }
    __name(load, "load");
    load();
  }, [id, isEdit, navigate]);
  if (isEdit && !can("sales_orders", "edit")) {
    navigate("/sales-orders");
    return null;
  }
  if (!isEdit && !can("sales_orders", "create")) {
    navigate("/sales-orders");
    return null;
  }
  function updateLine(i, patch) {
    setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  }
  __name(updateLine, "updateLine");
  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }
  __name(addLine, "addLine");
  function removeLine(i) {
    setLines((prev) => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);
  }
  __name(removeLine, "removeLine");
  const linesTotal = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.price) || 0), 0);
  const selectedPo = pos.find((p) => p.id === form.po_id);
  async function save(e) {
    e.preventDefault();
    if (!form.customer_id) {
      setFormError(t("\u0627\u062E\u062A\u0631 \u0639\u0645\u064A\u0644"));
      return;
    }
    if (!form.po_id) {
      setFormError(t("\u0627\u062E\u062A\u0631 \u0623\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621 (PO)"));
      return;
    }
    const validItems = lines.filter((l) => (l.product_description || "").trim() && l.quantity > 0);
    if (validItems.length === 0) {
      setFormError(t("\u0636\u064A\u0641 \u0635\u0646\u0641 \u0648\u0627\u062D\u062F \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0628\u0643\u0645\u064A\u0629 \u0623\u0643\u0628\u0631 \u0645\u0646 \u0635\u0641\u0631"));
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      const header = {
        po_id: form.po_id,
        sap_so_number: form.sap_so_number || null,
        factory_so_number: form.factory_so_number || null,
        so_date: form.so_date,
        notes: form.notes || null,
        ...isEdit ? {} : { so_number: `SO-${Date.now()}` }
      };
      const { error } = isEdit ? await (0, import_mutations.updateSo)(id, originalPoId, header, validItems) : await (0, import_mutations.createSo)(header, validItems);
      if (error) throw new Error(error.message || String(error));
      navigate("/sales-orders");
    } catch (err) {
      setFormError(t("\u062D\u062F\u062B \u062E\u0637\u0623: ") + err.message);
    } finally {
      setSaving(false);
    }
  }
  __name(save, "save");
  if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "py-10 text-center text-sm", style: { color: "var(--color-ink-soft)" }, children: t("...\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644") });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-5 max-w-4xl", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => navigate("/sales-orders"), className: "text-sm font-semibold", style: { color: "var(--color-ink-soft)" }, children: [
      "\u2190 ",
      t("\u0631\u062C\u0648\u0639")
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "font-display font-extrabold text-2xl", children: t(isEdit ? "\u062A\u0639\u062F\u064A\u0644 \u0623\u0645\u0631 \u0628\u064A\u0639" : "\u0623\u0645\u0631 \u0628\u064A\u0639 \u062C\u062F\u064A\u062F") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: save, className: `${import_ui.card} p-5 space-y-4`, style: import_ui.cardStyle, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-2 gap-3", children: [
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
              onChange: (e) => setForm({ ...form, customer_id: e.target.value, po_id: "" }),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: t("\u0627\u062E\u062A\u0631 \u0639\u0645\u064A\u0644...") }),
                customers.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: c.id, children: c.name }, c.id))
              ]
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0623\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621 (PO) *") }),
          !form.customer_id ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { disabled: true, className: import_ui.input, style: import_ui.inputStyle, placeholder: t("\u0627\u062E\u062A\u0631 \u0639\u0645\u064A\u0644 \u0627\u0644\u0623\u0648\u0644...") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            import_SearchableSelect.default,
            {
              value: form.po_id,
              options: pos,
              getId: (p) => p.id,
              getLabel: (p) => p.po_number,
              getSubLabel: (p) => `${t("\u0645\u062A\u0627\u062D \u0644\u0644\u062A\u062E\u0635\u064A\u0635")}: ${p.po_quantity - p.allocated_qty}`,
              matches: (p, q) => p.po_number.toLowerCase().includes(q),
              onChange: (pid) => setForm({ ...form, po_id: pid }),
              placeholder: t("\u0627\u0628\u062D\u062B \u0628\u0631\u0642\u0645 PO...")
            }
          ),
          selectedPo && form.customer_id === poCustomerId && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "text-xs mt-1", style: { color: "var(--color-ink-soft)" }, children: [
            t("\u0643\u0645\u064A\u0629 PO"),
            ": ",
            selectedPo.po_quantity,
            " \u2014 ",
            t("\u0645\u062A\u0628\u0642\u064A"),
            ": ",
            selectedPo.po_quantity - selectedPo.allocated_qty
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-3 gap-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("SAP SO") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: import_ui.input, style: import_ui.inputStyle, value: form.sap_so_number, onChange: (e) => setForm({ ...form, sap_so_number: e.target.value }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("Access SO") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: import_ui.input, style: import_ui.inputStyle, value: form.factory_so_number, onChange: (e) => setForm({ ...form, factory_so_number: e.target.value }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u062A\u0627\u0631\u064A\u062E SO") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "date", className: import_ui.input, style: import_ui.inputStyle, value: form.so_date, onChange: (e) => setForm({ ...form, so_date: e.target.value }) })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0627\u0644\u0623\u0635\u0646\u0627\u0641 (Items) *") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "rounded-lg border overflow-x-auto", style: { borderColor: "var(--color-border)" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "w-full min-w-[720px]", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { style: { background: import_ui.BRAND_BLUE }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "text-start text-xs font-bold px-2 py-2 text-white", children: t("\u0648\u0635\u0641 \u0627\u0644\u0635\u0646\u0641") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "text-start text-xs font-bold px-2 py-2 text-white w-24", children: t("\u0627\u0644\u0643\u0645\u064A\u0629") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "text-start text-xs font-bold px-2 py-2 text-white w-24", children: t("\u0627\u0644\u0633\u0639\u0631") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "text-start text-xs font-bold px-2 py-2 text-white w-24", children: t("\u0627\u0644\u0642\u064A\u0645\u0629") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "text-start text-xs font-bold px-2 py-2 text-white w-20", children: t("Proof") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "text-start text-xs font-bold px-2 py-2 text-white w-16", children: t("Ver.") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "text-start text-xs font-bold px-2 py-2 text-white w-24", children: t("Type") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "text-start text-xs font-bold px-2 py-2 text-white w-28", children: t("\u0645\u0644\u0627\u062D\u0638\u0629") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "w-8" })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: lines.map((l, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: "border-t", style: { borderColor: "var(--color-border)" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-1", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: import_ui.input, style: import_ui.inputStyle, value: l.product_description || "", onChange: (e) => updateLine(i, { product_description: e.target.value }), placeholder: t("\u0648\u0635\u0641 \u0627\u0644\u0635\u0646\u0641...") }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-1", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "number", step: "any", className: `${import_ui.input} tabular`, style: import_ui.inputStyle, value: l.quantity || "", onChange: (e) => updateLine(i, { quantity: Number(e.target.value) || 0 }) }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-1", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "number", step: "any", className: `${import_ui.input} tabular`, style: import_ui.inputStyle, value: l.price || "", onChange: (e) => updateLine(i, { price: Number(e.target.value) || 0 }) }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-1 px-2 text-sm tabular font-medium", children: ((l.quantity || 0) * (l.price || 0)).toLocaleString() }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-1", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: import_ui.input, style: import_ui.inputStyle, value: l.proof_number || "", onChange: (e) => updateLine(i, { proof_number: e.target.value }) }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-1", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: import_ui.input, style: import_ui.inputStyle, value: l.version || "", onChange: (e) => updateLine(i, { version: e.target.value }) }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-1", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: import_ui.input, style: import_ui.inputStyle, value: l.so_type || "", onChange: (e) => updateLine(i, { so_type: e.target.value }) }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-1", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: import_ui.input, style: import_ui.inputStyle, value: l.notes || "", onChange: (e) => updateLine(i, { notes: e.target.value }) }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-1 text-center", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => removeLine(i), disabled: lines.length === 1, className: "text-sm disabled:opacity-30", style: { color: "var(--color-danger)" }, children: "\u2715" }) })
          ] }, i)) })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "button", onClick: addLine, className: import_ui.btnSecondary, style: { ...import_ui.btnSecondaryStyle, padding: "4px 12px" }, children: [
            "+ ",
            t("\u0625\u0636\u0627\u0641\u0629 \u0635\u0646\u0641 (Add line item)")
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "text-sm font-bold", children: [
            t("\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A"),
            ": ",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "tabular", style: { color: "var(--color-primary)" }, children: linesTotal.toLocaleString() })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0639\u0627\u0645\u0629") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: import_ui.input, style: import_ui.inputStyle, value: form.notes, onChange: (e) => setForm({ ...form, notes: e.target.value }) })
      ] }),
      formError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-sm", style: { color: "var(--color-danger)" }, children: formError }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex gap-2 pt-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", disabled: saving, className: import_ui.btnPrimary, style: import_ui.btnPrimaryStyle, children: saving ? t("...\u062C\u0627\u0631\u064A \u0627\u0644\u062D\u0641\u0638") : t("\u062D\u0641\u0638") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => navigate("/sales-orders"), className: import_ui.btnSecondary, style: import_ui.btnSecondaryStyle, children: t("\u0625\u0644\u063A\u0627\u0621") })
      ] })
    ] })
  ] });
}
__name(SalesOrderForm, "SalesOrderForm");

});
