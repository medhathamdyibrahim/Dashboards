// pages/Products.js — compiled from src/pages/Products.tsx (readable, unminified)
__modules__.define("pages/Products", function (module, exports, require) {
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
var Products_exports = {};
__export(Products_exports, {
  default: () => Products
});
module.exports = __toCommonJS(Products_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_react = require("react");
var import_supabaseClient = require("../lib/supabaseClient");
var import_secureClient = require("../lib/secureClient");
var import_AuthContext = require("../context/AuthContext");
var import_LanguageContext = require("../context/LanguageContext");
var import_Modal = __toESM(require("../components/Modal"));
var import_exportExcel = require("../lib/exportExcel");
var import_format = require("../lib/format");
var import_ui = require("../lib/ui");
const empty = { code: "", name: "", unit: "piece", default_price: 0, default_currency: "EGP", is_active: true, proof_number: "", customer_id: "", version: "1" };
function Products() {
  const { can } = (0, import_AuthContext.useAuth)();
  const { t } = (0, import_LanguageContext.useLanguage)();
  const [rows, setRows] = (0, import_react.useState)([]);
  const [customers, setCustomers] = (0, import_react.useState)([]);
  const [currencies, setCurrencies] = (0, import_react.useState)([]);
  const [search, setSearch] = (0, import_react.useState)("");
  const [editing, setEditing] = (0, import_react.useState)(null);
  const [form, setForm] = (0, import_react.useState)(empty);
  const [showForm, setShowForm] = (0, import_react.useState)(false);
  const [showImportHelp, setShowImportHelp] = (0, import_react.useState)(false);
  const [importing, setImporting] = (0, import_react.useState)(false);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const fileInputRef = (0, import_react.useRef)(null);
  async function load() {
    setLoading(true);
    const [p, c, cur] = await Promise.all([
      import_supabaseClient.supabase.from("products").select("*, customers(name, sap_code)").order("created_at", { ascending: false }),
      (0, import_secureClient.secureFrom)("customers").select("*").order("name"),
      import_supabaseClient.supabase.from("currencies").select("*")
    ]);
    setRows(p.data || []);
    setCustomers(c.data || []);
    setCurrencies(cur.data || []);
    setLoading(false);
  }
  __name(load, "load");
  (0, import_react.useEffect)(() => {
    load();
  }, []);
  function openNew() {
    setEditing(null);
    setForm(empty);
    setShowForm(true);
  }
  __name(openNew, "openNew");
  function openEdit(p) {
    setEditing(p);
    setForm({
      code: p.code,
      name: p.name,
      unit: p.unit,
      default_price: p.default_price,
      default_currency: p.default_currency,
      is_active: p.is_active,
      proof_number: p.proof_number || "",
      customer_id: p.customer_id || "",
      version: p.version || "1"
    });
    setShowForm(true);
  }
  __name(openEdit, "openEdit");
  async function save(e) {
    e.preventDefault();
    const payload = { ...form, customer_id: form.customer_id || null, proof_number: form.proof_number || null };
    if (editing) await import_supabaseClient.supabase.from("products").update(payload).eq("id", editing.id);
    else await import_supabaseClient.supabase.from("products").insert(payload);
    setShowForm(false);
    load();
  }
  __name(save, "save");
  async function remove(p) {
    if (!confirm(`${t("\u062D\u0630\u0641 \u0627\u0644\u0645\u0646\u062A\u062C")} "${p.name}"\u061F`)) return;
    await import_supabaseClient.supabase.from("products").delete().eq("id", p.id);
    load();
  }
  __name(remove, "remove");
  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const rowsIn = await (0, import_exportExcel.readExcelFile)(file);
      if (rowsIn.length === 0) {
        alert(t("\u0627\u0644\u0645\u0644\u0641 \u0641\u0627\u0631\u063A"));
        return;
      }
      const customersBySap = {};
      for (const c of customers) if (c.sap_code) customersBySap[c.sap_code.toLowerCase()] = c.id;
      let skippedNoCustomer = 0;
      const payload = rowsIn.map((r) => {
        const sapCode = String(r["SAP Client Code"] || r["SAP Code"] || "").trim();
        const customerId = customersBySap[sapCode.toLowerCase()];
        if (sapCode && !customerId) skippedNoCustomer++;
        const proof = String(r["Proof"] || "").trim();
        const version = String(r["Version"] || "1").trim() || "1";
        return {
          code: proof ? `PRF-${proof}-v${version}` : String(r["Code"] || "").trim(),
          name: String(r["Name"] || "").trim(),
          proof_number: proof || null,
          version,
          customer_id: customerId || null,
          unit: "piece",
          default_price: 0,
          default_currency: "EGP",
          is_active: true
        };
      }).filter((r) => r.name && r.code);
      if (payload.length === 0) {
        alert(t("\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0635\u0641\u0648\u0641 \u0635\u062D\u064A\u062D\u0629 (\u062A\u0623\u0643\u062F \u0645\u0646 \u0648\u062C\u0648\u062F \u0623\u0639\u0645\u062F\u0629 Proof \u0648 Name)"));
        return;
      }
      const { error } = await import_supabaseClient.supabase.from("products").upsert(payload, { onConflict: "code" });
      if (error) throw error;
      alert(`${t("\u062A\u0645 \u0627\u0633\u062A\u064A\u0631\u0627\u062F")} ${payload.length} ${t("\u0645\u0646\u062A\u062C \u0628\u0646\u062C\u0627\u062D")}` + (skippedNoCustomer ? ` (${skippedNoCustomer} ${t("\u0635\u0641 \u0628\u0643\u0648\u062F SAP \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641\u060C \u0627\u062A\u062D\u0641\u0638 \u0628\u062F\u0648\u0646 \u0631\u0628\u0637 \u0639\u0645\u064A\u0644")})` : ""));
      load();
    } catch (err) {
      alert(t("\u0641\u0634\u0644 \u0627\u0644\u0627\u0633\u062A\u064A\u0631\u0627\u062F: ") + err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }
  __name(handleImportFile, "handleImportFile");
  const filtered = rows.filter((r) => (r.name + r.code + (r.proof_number || "")).toLowerCase().includes(search.toLowerCase()));
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-5", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "font-display font-extrabold text-2xl", children: t("\u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => setShowImportHelp(true), className: import_ui.btnSecondary, style: import_ui.btnSecondaryStyle, children: [
          "\u2B71 ",
          t("\u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0645\u0646 Excel")
        ] }),
        can("products", "create") && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: openNew, className: import_ui.btnPrimary, style: import_ui.btnPrimaryStyle, children: [
          "+ ",
          t("\u0645\u0646\u062A\u062C \u062C\u062F\u064A\u062F")
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { placeholder: t("\u0628\u062D\u062B \u0628\u0627\u0644\u0643\u0648\u062F\u060C \u0627\u0644\u0627\u0633\u0645\u060C \u0623\u0648 \u0631\u0642\u0645 Proof..."), className: `${import_ui.input} max-w-xs`, style: import_ui.inputStyle, value: search, onChange: (e) => setSearch(e.target.value) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `${import_ui.card} overflow-hidden`, style: import_ui.cardStyle, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "w-full", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u0643\u0648\u062F") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u0627\u0633\u0645") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: "Proof" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: "Version" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u0639\u0645\u064A\u0644") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u062D\u0627\u0644\u0629") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { colSpan: 8, className: "px-3 py-8 text-center text-sm", style: { color: "var(--color-ink-soft)" }, children: t("...\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644") }) }) : filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { colSpan: 8, className: "px-3 py-8 text-center text-sm", style: { color: "var(--color-ink-soft)" }, children: t("\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0646\u062A\u062C\u0627\u062A") }) }) : filtered.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: "border-t", style: { borderColor: "var(--color-border)" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} font-mono`, children: p.code }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} font-medium`, children: p.name }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} font-mono text-xs`, style: { color: "var(--color-ink-soft)" }, children: p.proof_number || "\u2014" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} tabular`, children: p.version || "\u2014" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: import_ui.td, children: p.customers?.name || "\u2014" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} tabular`, children: (0, import_format.money)(p.default_price, p.default_currency) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: import_ui.td, children: p.is_active ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "var(--color-primary)" }, children: t("\u0646\u0634\u0637") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "var(--color-ink-soft)" }, children: t("\u063A\u064A\u0631 \u0646\u0634\u0637") }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: import_ui.td, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex gap-3 justify-end", children: [
          can("products", "edit") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => openEdit(p), className: "text-xs font-semibold", style: { color: "var(--color-primary)" }, children: t("\u062A\u0639\u062F\u064A\u0644") }),
          can("products", "delete") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => remove(p), className: "text-xs font-semibold", style: { color: "var(--color-danger)" }, children: t("\u062D\u0630\u0641") })
        ] }) })
      ] }, p.id)) })
    ] }) }),
    showForm && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_Modal.default, { title: t(editing ? "\u062A\u0639\u062F\u064A\u0644 \u0645\u0646\u062A\u062C" : "\u0645\u0646\u062A\u062C \u062C\u062F\u064A\u062F"), onClose: () => setShowForm(false), children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: save, className: "space-y-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0627\u0644\u0643\u0648\u062F *") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { required: true, className: `${import_ui.input} font-mono`, style: import_ui.inputStyle, value: form.code, onChange: (e) => setForm({ ...form, code: e.target.value }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0627\u0644\u0648\u062D\u062F\u0629") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: import_ui.input, style: import_ui.inputStyle, value: form.unit, onChange: (e) => setForm({ ...form, unit: e.target.value }) })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0627\u0644\u0627\u0633\u0645 *") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { required: true, className: import_ui.input, style: import_ui.inputStyle, value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: "Proof" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: `${import_ui.input} font-mono`, style: import_ui.inputStyle, value: form.proof_number, onChange: (e) => setForm({ ...form, proof_number: e.target.value }), placeholder: "1001" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: "Version" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: import_ui.input, style: import_ui.inputStyle, value: form.version, onChange: (e) => setForm({ ...form, version: e.target.value }) })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0627\u0644\u0639\u0645\u064A\u0644 \u0627\u0644\u0645\u0631\u062A\u0628\u0637 (SAP Code)") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { className: import_ui.input, style: import_ui.inputStyle, value: form.customer_id, onChange: (e) => setForm({ ...form, customer_id: e.target.value }), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: t("\u0628\u062F\u0648\u0646 \u062A\u062D\u062F\u064A\u062F") }),
          customers.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", { value: c.id, children: [
            c.name,
            " ",
            c.sap_code ? `(${c.sap_code})` : ""
          ] }, c.id))
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "number", step: "0.01", className: import_ui.input, style: import_ui.inputStyle, value: form.default_price, onChange: (e) => setForm({ ...form, default_price: Number(e.target.value) }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0627\u0644\u0639\u0645\u0644\u0629") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", { className: import_ui.input, style: import_ui.inputStyle, value: form.default_currency, onChange: (e) => setForm({ ...form, default_currency: e.target.value }), children: currencies.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: c.code, children: c.code }, c.code)) })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "flex items-center gap-2 text-sm", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: form.is_active, onChange: (e) => setForm({ ...form, is_active: e.target.checked }) }),
        " ",
        t("\u0646\u0634\u0637")
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex gap-2 pt-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", className: import_ui.btnPrimary, style: import_ui.btnPrimaryStyle, children: t("\u062D\u0641\u0638") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => setShowForm(false), className: import_ui.btnSecondary, style: import_ui.btnSecondaryStyle, children: t("\u0625\u0644\u063A\u0627\u0621") })
      ] })
    ] }) }),
    showImportHelp && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_Modal.default, { title: t("\u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0645\u0646 Excel"), onClose: () => setShowImportHelp(false), children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-4 text-sm", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { color: "var(--color-ink-soft)" }, children: t("\u0647\u064A\u0643\u0644 \u0627\u0644\u0634\u064A\u062A \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u2014 \u0627\u0644\u0635\u0641 \u0627\u0644\u0623\u0648\u0644 \u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u0623\u0639\u0645\u062F\u0629 \u0628\u0627\u0644\u0638\u0628\u0637 \u0643\u062F\u0647:") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `${import_ui.card} p-3 overflow-x-auto`, style: import_ui.cardStyle, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "w-full text-xs", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { style: { color: "var(--color-primary)" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "text-start p-1 font-bold", children: "Proof" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "text-start p-1 font-bold", children: "Name" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "text-start p-1 font-bold", children: "SAP Client Code" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "text-start p-1 font-bold", children: "Version" })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { style: { color: "var(--color-ink-soft)" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-1", children: "1001" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-1", children: "\u0643\u0627\u0631\u062A \u0628\u0644\u0627\u0633\u062A\u064A\u0643 VIP" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-1", children: "SAP-100" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-1", children: "2" })
        ] }) })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", { className: "list-disc pr-4 space-y-1", style: { color: "var(--color-ink-soft)" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: t("\u0639\u0645\u0648\u062F\u064A Proof \u0648Name \u0625\u0644\u0632\u0627\u0645\u064A\u064A\u0646.") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: t("SAP Client Code \u0644\u0627\u0632\u0645 \u064A\u0643\u0648\u0646 \u0645\u0637\u0627\u0628\u0642 \u0644\u0643\u0648\u062F \u0639\u0645\u064A\u0644 \u0645\u0648\u062C\u0648\u062F \u0628\u0627\u0644\u0641\u0639\u0644 \u0639\u0634\u0627\u0646 \u064A\u062A\u0631\u064E\u0628\u0637 \u0627\u0644\u0645\u0646\u062A\u062C \u0628\u064A\u0647.") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: t("\u0646\u0641\u0633 \u0631\u0642\u0645 Proof \u0628\u0641\u0631\u0635\u0627\u064A\u0627\u062A \u0645\u062E\u062A\u0644\u0641\u0629 \u0628\u064A\u062A\u0633\u062C\u0644 \u0643\u0635\u0641\u0648\u0641 \u0645\u0646\u0641\u0635\u0644\u0629 (\u0645\u0646\u062A\u062C\u0627\u062A \u0645\u062E\u062A\u0644\u0641\u0629).") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { ref: fileInputRef, type: "file", accept: ".xlsx,.xls", onChange: handleImportFile, disabled: importing, className: "text-sm" }),
      importing && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: "var(--color-ink-soft)" }, children: t("...\u062C\u0627\u0631\u064A \u0627\u0644\u0627\u0633\u062A\u064A\u0631\u0627\u062F") })
    ] }) })
  ] });
}
__name(Products, "Products");

});
