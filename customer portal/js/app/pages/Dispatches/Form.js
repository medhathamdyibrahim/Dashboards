// pages/Dispatches/Form.js — compiled from src/pages/Dispatches/Form.tsx (readable, unminified)
__modules__.define("pages/Dispatches/Form", function (module, exports, require) {
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
  default: () => DispatchForm
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
function DispatchForm() {
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
    dispatch_number: "",
    so_id: "",
    dispatch_quantity: "",
    dispatch_date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
    awb_tracking: "",
    status: "draft",
    delivery_date: "",
    notes: ""
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
      const { data } = await (0, import_secureClient.secureFrom)("dispatches").select("*").eq("id", id).single();
      if (!data) {
        navigate("/dispatches");
        return;
      }
      setForm({
        customer_id: data.customer_id,
        dispatch_number: data.dispatch_number,
        so_id: data.so_id,
        dispatch_quantity: String(data.dispatch_quantity || ""),
        dispatch_date: data.dispatch_date,
        awb_tracking: data.awb_tracking || "",
        status: data.status,
        delivery_date: data.delivery_date || "",
        notes: data.notes || ""
      });
      setOriginalSoId(data.so_id);
      setLoading(false);
    }
    __name(load, "load");
    load();
  }, [id, isEdit, navigate]);
  if (isEdit && !can("dispatches", "edit")) {
    navigate("/dispatches");
    return null;
  }
  if (!isEdit && !can("dispatches", "create")) {
    navigate("/dispatches");
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
    if (!form.dispatch_number.trim()) {
      setFormError(t("\u0623\u062F\u062E\u0644 \u0631\u0642\u0645 \u0627\u0644\u0634\u062D\u0646\u0629"));
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      const payload = {
        dispatch_number: form.dispatch_number.trim(),
        so_id: form.so_id,
        dispatch_quantity: Number(form.dispatch_quantity) || 0,
        dispatch_date: form.dispatch_date,
        awb_tracking: form.awb_tracking || null,
        status: form.status,
        delivery_date: form.delivery_date || null,
        notes: form.notes || null
      };
      const { error } = isEdit ? await (0, import_mutations.updateDispatch)(id, originalSoId, payload) : await (0, import_mutations.createDispatch)(payload);
      if (error) throw new Error(error.message || String(error));
      navigate("/dispatches");
    } catch (err) {
      setFormError(t("\u062D\u062F\u062B \u062E\u0637\u0623: ") + err.message);
    } finally {
      setSaving(false);
    }
  }
  __name(save, "save");
  if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "py-10 text-center text-sm", style: { color: "var(--color-ink-soft)" }, children: t("...\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644") });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-5 max-w-3xl", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => navigate("/dispatches"), className: "text-sm font-semibold", style: { color: "var(--color-ink-soft)" }, children: [
      "\u2190 ",
      t("\u0631\u062C\u0648\u0639")
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "font-display font-extrabold text-2xl", children: t(isEdit ? "\u062A\u0639\u062F\u064A\u0644 \u0634\u062D\u0646\u0629" : "\u0634\u062D\u0646\u0629 \u062C\u062F\u064A\u062F\u0629") }),
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
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0631\u0642\u0645 \u0627\u0644\u0634\u062D\u0646\u0629 *") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { required: true, className: `${import_ui.input} font-mono`, style: import_ui.inputStyle, value: form.dispatch_number, onChange: (e) => setForm({ ...form, dispatch_number: e.target.value }), placeholder: t("\u0627\u0643\u062A\u0628 \u0631\u0642\u0645 \u0627\u0644\u0634\u062D\u0646\u0629...") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0627\u0644\u0643\u0645\u064A\u0629") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "number", step: "any", className: `${import_ui.input} tabular`, style: import_ui.inputStyle, value: form.dispatch_quantity, onChange: (e) => setForm({ ...form, dispatch_quantity: e.target.value }) })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0634\u062D\u0646") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "date", className: import_ui.input, style: import_ui.inputStyle, value: form.dispatch_date, onChange: (e) => setForm({ ...form, dispatch_date: e.target.value }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u062D\u0627\u0644\u0629 \u0627\u0644\u062A\u0633\u0644\u064A\u0645") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { className: import_ui.input, style: import_ui.inputStyle, value: form.status, onChange: (e) => setForm({ ...form, status: e.target.value }), children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "draft", children: t("\u0645\u0633\u0648\u062F\u0629") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "shipped", children: t("\u062A\u0645 \u0627\u0644\u0634\u062D\u0646") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "delivered", children: t("\u062A\u0645 \u0627\u0644\u062A\u0633\u0644\u064A\u0645") })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("AWB / Tracking") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: import_ui.input, style: import_ui.inputStyle, value: form.awb_tracking, onChange: (e) => setForm({ ...form, awb_tracking: e.target.value }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u062A\u0633\u0644\u064A\u0645") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "date", className: import_ui.input, style: import_ui.inputStyle, value: form.delivery_date, onChange: (e) => setForm({ ...form, delivery_date: e.target.value }) })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0645\u0644\u0627\u062D\u0638\u0627\u062A") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: import_ui.input, style: import_ui.inputStyle, value: form.notes, onChange: (e) => setForm({ ...form, notes: e.target.value }) })
      ] }),
      formError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-sm", style: { color: "var(--color-danger)" }, children: formError }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex gap-2 pt-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", disabled: saving, className: import_ui.btnPrimary, style: import_ui.btnPrimaryStyle, children: saving ? t("...\u062C\u0627\u0631\u064A \u0627\u0644\u062D\u0641\u0638") : t("\u062D\u0641\u0638") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => navigate("/dispatches"), className: import_ui.btnSecondary, style: import_ui.btnSecondaryStyle, children: t("\u0625\u0644\u063A\u0627\u0621") })
      ] })
    ] })
  ] });
}
__name(DispatchForm, "DispatchForm");

});
