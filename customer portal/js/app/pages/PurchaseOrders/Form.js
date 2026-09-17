// pages/PurchaseOrders/Form.js — compiled from src/pages/PurchaseOrders/Form.tsx (readable, unminified)
__modules__.define("pages/PurchaseOrders/Form", function (module, exports, require) {
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
var Form_exports = {};
__export(Form_exports, {
  default: () => PurchaseOrderForm
});
module.exports = __toCommonJS(Form_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_react = require("react");
var import_react_router_dom = require("react-router-dom");
var import_secureClient = require("../../lib/secureClient");
var import_AuthContext = require("../../context/AuthContext");
var import_LanguageContext = require("../../context/LanguageContext");
var import_mutations = require("../../lib/repository/mutations");
var import_ui = require("../../lib/ui");
const emptyLine = /* @__PURE__ */ __name(() => ({ item_name: "", quantity: 0, price: 0 }), "emptyLine");
function PurchaseOrderForm() {
  const { id } = (0, import_react_router_dom.useParams)();
  const isEdit = !!id;
  const navigate = (0, import_react_router_dom.useNavigate)();
  const { can } = (0, import_AuthContext.useAuth)();
  const { t } = (0, import_LanguageContext.useLanguage)();
  const [customers, setCustomers] = (0, import_react.useState)([]);
  const [loading, setLoading] = (0, import_react.useState)(isEdit);
  const [saving, setSaving] = (0, import_react.useState)(false);
  const [formError, setFormError] = (0, import_react.useState)(null);
  const [form, setForm] = (0, import_react.useState)({
    po_number: "",
    customer_id: "",
    is_itemized: false,
    item_name: "",
    po_date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
    po_quantity: "",
    asp: "",
    notes: ""
  });
  const [lines, setLines] = (0, import_react.useState)([emptyLine()]);
  (0, import_react.useEffect)(() => {
    (0, import_secureClient.secureFrom)("customers").select("*").order("name").then((res) => setCustomers(res.data || []));
  }, []);
  (0, import_react.useEffect)(() => {
    if (!isEdit) return;
    async function load() {
      const { data } = await (0, import_secureClient.secureFrom)("purchase_orders").select("*").eq("id", id).single();
      if (!data) {
        navigate("/purchase-orders");
        return;
      }
      setForm({
        po_number: data.po_number,
        customer_id: data.customer_id,
        is_itemized: data.is_itemized,
        item_name: data.item_name || "",
        po_date: data.po_date,
        po_quantity: String(data.po_quantity || ""),
        asp: String(data.asp || ""),
        notes: data.notes || ""
      });
      if (data.is_itemized) {
        const items = await (0, import_mutations.listPoItems)(id);
        setLines(items.length ? items.map((i) => ({ item_name: i.item_name, quantity: i.quantity, price: i.price })) : [emptyLine()]);
      }
      setLoading(false);
    }
    __name(load, "load");
    load();
  }, [id, isEdit, navigate]);
  if (isEdit && !can("purchase_orders", "edit")) {
    navigate("/purchase-orders");
    return null;
  }
  if (!isEdit && !can("purchase_orders", "create")) {
    navigate("/purchase-orders");
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
  async function save(e) {
    e.preventDefault();
    if (!form.po_number.trim()) {
      setFormError(t("\u0623\u062F\u062E\u0644 \u0631\u0642\u0645 PO"));
      return;
    }
    if (!form.customer_id) {
      setFormError(t("\u0627\u062E\u062A\u0631 \u0639\u0645\u064A\u0644"));
      return;
    }
    if (form.is_itemized) {
      const valid = lines.filter((l) => (l.item_name || "").trim() && l.quantity > 0);
      if (valid.length === 0) {
        setFormError(t("\u0636\u064A\u0641 \u0635\u0646\u0641 \u0648\u0627\u062D\u062F \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0628\u0643\u0645\u064A\u0629 \u0623\u0643\u0628\u0631 \u0645\u0646 \u0635\u0641\u0631"));
        return;
      }
    }
    setFormError(null);
    setSaving(true);
    try {
      const qty = Number(form.po_quantity) || 0;
      const asp = Number(form.asp) || 0;
      const header = {
        po_number: form.po_number.trim(),
        customer_id: form.customer_id,
        is_itemized: form.is_itemized,
        po_date: form.po_date,
        notes: form.notes || null,
        ...form.is_itemized ? {} : { item_name: form.item_name || null, po_quantity: qty, asp, po_value: qty * asp }
      };
      const items = form.is_itemized ? lines.filter((l) => (l.item_name || "").trim() && l.quantity > 0) : void 0;
      const { error } = isEdit ? await (0, import_mutations.updatePo)(id, header, items) : await (0, import_mutations.createPo)(header, items);
      if (error) throw new Error(error.message || String(error));
      navigate("/purchase-orders");
    } catch (err) {
      setFormError(t("\u062D\u062F\u062B \u062E\u0637\u0623: ") + err.message);
    } finally {
      setSaving(false);
    }
  }
  __name(save, "save");
  if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "py-10 text-center text-sm", style: { color: "var(--color-ink-soft)" }, children: t("...\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644") });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-5 max-w-3xl", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex items-center gap-3", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => navigate("/purchase-orders"), className: "text-sm font-semibold", style: { color: "var(--color-ink-soft)" }, children: [
      "\u2190 ",
      t("\u0631\u062C\u0648\u0639")
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "font-display font-extrabold text-2xl", children: t(isEdit ? "\u062A\u0639\u062F\u064A\u0644 \u0623\u0645\u0631 \u0634\u0631\u0627\u0621" : "\u0623\u0645\u0631 \u0634\u0631\u0627\u0621 \u062C\u062F\u064A\u062F") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: save, className: `${import_ui.card} p-5 space-y-4`, style: import_ui.cardStyle, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0631\u0642\u0645 PO *") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { required: true, autoFocus: true, className: `${import_ui.input} font-mono`, style: import_ui.inputStyle, value: form.po_number, onChange: (e) => setForm({ ...form, po_number: e.target.value }), placeholder: t("\u0627\u0643\u062A\u0628 \u0631\u0642\u0645 PO...") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0627\u0644\u0639\u0645\u064A\u0644 *") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { required: true, className: import_ui.input, style: import_ui.inputStyle, value: form.customer_id, onChange: (e) => setForm({ ...form, customer_id: e.target.value }), children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: t("\u0627\u062E\u062A\u0631 \u0639\u0645\u064A\u0644...") }),
            customers.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: c.id, children: c.name }, c.id))
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u062A\u0627\u0631\u064A\u062E PO") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "date", className: `${import_ui.input} max-w-xs`, style: import_ui.inputStyle, value: form.po_date, onChange: (e) => setForm({ ...form, po_date: e.target.value }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex rounded-lg border overflow-hidden w-fit", style: { borderColor: "var(--color-border)" }, children: [{ v: false, label: "\u0628\u0633\u064A\u0637 (Simple)" }, { v: true, label: "\u0645\u064F\u0641\u0635\u0651\u0644 (Itemized)" }].map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          onClick: () => setForm({ ...form, is_itemized: opt.v }),
          className: "px-4 py-1.5 text-sm font-semibold transition-colors",
          style: { background: form.is_itemized === opt.v ? import_ui.BRAND_BLUE : "transparent", color: form.is_itemized === opt.v ? "#fff" : "var(--color-ink-soft)" },
          children: t(opt.label)
        },
        String(opt.v)
      )) }),
      !form.is_itemized ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0627\u0633\u0645 \u0627\u0644\u0635\u0646\u0641 (Item Name)") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: import_ui.input, style: import_ui.inputStyle, value: form.item_name, onChange: (e) => setForm({ ...form, item_name: e.target.value }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0627\u0644\u0643\u0645\u064A\u0629") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "number", step: "any", className: `${import_ui.input} tabular`, style: import_ui.inputStyle, value: form.po_quantity, onChange: (e) => setForm({ ...form, po_quantity: e.target.value }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("ASP") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "number", step: "any", className: `${import_ui.input} tabular`, style: import_ui.inputStyle, value: form.asp, onChange: (e) => setForm({ ...form, asp: e.target.value }) })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "text-xs", style: { color: "var(--color-ink-soft)" }, children: [
          t("\u0627\u0644\u0642\u064A\u0645\u0629 (PO Value) = \u0627\u0644\u0643\u0645\u064A\u0629 \xD7 ASP ="),
          " ",
          ((Number(form.po_quantity) || 0) * (Number(form.asp) || 0)).toLocaleString()
        ] })
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0627\u0644\u0623\u0635\u0646\u0627\u0641 (Items)") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "rounded-lg border overflow-hidden", style: { borderColor: "var(--color-border)" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "w-full", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { style: { background: import_ui.BRAND_BLUE }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "text-start text-xs font-bold px-2 py-2 text-white", children: t("\u0627\u0633\u0645 \u0627\u0644\u0635\u0646\u0641") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "text-start text-xs font-bold px-2 py-2 text-white w-28", children: t("\u0627\u0644\u0643\u0645\u064A\u0629") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "text-start text-xs font-bold px-2 py-2 text-white w-28", children: t("\u0627\u0644\u0633\u0639\u0631") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "text-start text-xs font-bold px-2 py-2 text-white w-28", children: t("\u0627\u0644\u0642\u064A\u0645\u0629") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "w-8" })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: lines.map((l, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: "border-t", style: { borderColor: "var(--color-border)" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-1", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: import_ui.input, style: import_ui.inputStyle, value: l.item_name || "", onChange: (e) => updateLine(i, { item_name: e.target.value }), placeholder: t("\u0627\u0633\u0645 \u0627\u0644\u0635\u0646\u0641...") }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-1", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "number", step: "any", className: `${import_ui.input} tabular`, style: import_ui.inputStyle, value: l.quantity || "", onChange: (e) => updateLine(i, { quantity: Number(e.target.value) || 0 }) }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-1", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "number", step: "any", className: `${import_ui.input} tabular`, style: import_ui.inputStyle, value: l.price || "", onChange: (e) => updateLine(i, { price: Number(e.target.value) || 0 }) }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-1 px-2 text-sm tabular font-medium", children: ((l.quantity || 0) * (l.price || 0)).toLocaleString() }),
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
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0645\u0644\u0627\u062D\u0638\u0627\u062A") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: import_ui.input, style: import_ui.inputStyle, value: form.notes, onChange: (e) => setForm({ ...form, notes: e.target.value }) })
      ] }),
      formError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-sm", style: { color: "var(--color-danger)" }, children: formError }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex gap-2 pt-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", disabled: saving, className: import_ui.btnPrimary, style: import_ui.btnPrimaryStyle, children: saving ? t("...\u062C\u0627\u0631\u064A \u0627\u0644\u062D\u0641\u0638") : t("\u062D\u0641\u0638") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => navigate("/purchase-orders"), className: import_ui.btnSecondary, style: import_ui.btnSecondaryStyle, children: t("\u0625\u0644\u063A\u0627\u0621") })
      ] })
    ] })
  ] });
}
__name(PurchaseOrderForm, "PurchaseOrderForm");

});
