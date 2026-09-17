// pages/Customers.js — compiled from src/pages/Customers.tsx (readable, unminified)
__modules__.define("pages/Customers", function (module, exports, require) {
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
var Customers_exports = {};
__export(Customers_exports, {
  default: () => Customers
});
module.exports = __toCommonJS(Customers_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_react = require("react");
var import_supabaseClient = require("../lib/supabaseClient");
var import_secureClient = require("../lib/secureClient");
var import_AuthContext = require("../context/AuthContext");
var import_LanguageContext = require("../context/LanguageContext");
var import_Modal = __toESM(require("../components/Modal"));
var import_exportExcel = require("../lib/exportExcel");
var import_ui = require("../lib/ui");
const empty = { name: "", short_name: "", sap_code: "", region: "", local_export: "", owner_name: "", account_manager_id: "" };
function Customers() {
  const { can, isAdmin } = (0, import_AuthContext.useAuth)();
  const { t } = (0, import_LanguageContext.useLanguage)();
  const [rows, setRows] = (0, import_react.useState)([]);
  const [managers, setManagers] = (0, import_react.useState)([]);
  const [regions, setRegions] = (0, import_react.useState)([]);
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
    const [c, p, r] = await Promise.all([
      (0, import_secureClient.secureFrom)("customers").select("*, account_manager:profiles!customers_account_manager_id_fkey(full_name)").order("created_at", { ascending: false }),
      import_supabaseClient.supabase.from("profiles").select("*").eq("is_active", true).order("full_name"),
      import_supabaseClient.supabase.from("regions").select("name").order("name")
    ]);
    setRows(c.data || []);
    setManagers(p.data || []);
    setRegions((r.data || []).map((x) => x.name));
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
  function openEdit(c) {
    setEditing(c);
    setForm({
      name: c.name,
      short_name: c.short_name || "",
      sap_code: c.sap_code || "",
      region: c.region || "",
      local_export: c.local_export || "",
      owner_name: c.owner_name || "",
      account_manager_id: c.account_manager_id || ""
    });
    setShowForm(true);
  }
  __name(openEdit, "openEdit");
  async function ensureRegion(name) {
    if (!name || !isAdmin) return;
    await import_supabaseClient.supabase.from("regions").upsert({ name }, { onConflict: "name" });
  }
  __name(ensureRegion, "ensureRegion");
  async function save(e) {
    e.preventDefault();
    if (form.region) {
      if (isAdmin) {
        await ensureRegion(form.region);
      } else if (!regions.includes(form.region)) {
        alert(t("\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u062F\u064A \u0645\u0634 \u0645\u0648\u062C\u0648\u062F\u0629 \u0641\u064A \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u2014 \u0627\u0637\u0644\u0628 \u0645\u0646 \u0627\u0644\u0640 Admin \u064A\u0636\u064A\u0641\u0647\u0627 \u0627\u0644\u0623\u0648\u0644 \u0645\u0646 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u2190 Regions."));
        return;
      }
    }
    const payload = {
      ...form,
      account_manager_id: form.account_manager_id || null,
      sap_code: form.sap_code || null,
      region: form.region || null,
      local_export: form.local_export || null
    };
    if (editing) await (0, import_secureClient.secureFrom)("customers").update(payload).eq("id", editing.id);
    else await (0, import_secureClient.secureFrom)("customers").insert(payload);
    setShowForm(false);
    load();
  }
  __name(save, "save");
  async function remove(c) {
    if (!confirm(`${t("\u062D\u0630\u0641 \u0627\u0644\u0639\u0645\u064A\u0644")} "${c.name}"\u061F`)) return;
    await (0, import_secureClient.secureFrom)("customers").delete().eq("id", c.id);
    load();
  }
  __name(remove, "remove");
  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const rowsIn = await (0, import_exportExcel.readExcelFile)(file, "Customer Master Data");
      if (rowsIn.length === 0) {
        alert(t("\u0627\u0644\u0645\u0644\u0641 \u0641\u0627\u0631\u063A"));
        return;
      }
      const payload = rowsIn.map((r) => ({
        name: String(r["Customer Name"] || r["Name"] || "").trim(),
        short_name: String(r["Short Customer Name"] || "").trim() || null,
        sap_code: String(r["SAP Customer Code"] || r["SAP Code"] || "").trim() || null,
        region: String(r["Region"] || "").trim() || null,
        local_export: String(r["Local/Export"] || "").trim() || null,
        owner_name: String(r["Owner"] || "").trim() || null
      })).filter((r) => r.name);
      if (payload.length === 0) {
        alert(t("\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0635\u0641\u0648\u0641 \u0635\u062D\u064A\u062D\u0629 (\u062A\u0623\u0643\u062F \u0645\u0646 \u0648\u062C\u0648\u062F \u0639\u0645\u0648\u062F Customer Name)"));
        return;
      }
      const requestedRegions = Array.from(new Set(payload.map((p) => p.region).filter(Boolean)));
      let unknownRegions = [];
      if (isAdmin) {
        for (const rgn of requestedRegions) await ensureRegion(rgn);
      } else {
        unknownRegions = requestedRegions.filter((r) => !regions.includes(r));
        if (unknownRegions.length > 0) {
          for (const row of payload) if (row.region && unknownRegions.includes(row.region)) row.region = null;
        }
      }
      const withSap = payload.filter((p) => p.sap_code);
      const withoutSap = payload.filter((p) => !p.sap_code);
      if (withSap.length) await (0, import_secureClient.secureFrom)("customers").upsert(withSap, { onConflict: "sap_code" });
      if (withoutSap.length) await (0, import_secureClient.secureFrom)("customers").insert(withoutSap);
      let msg = `${t("\u062A\u0645 \u0627\u0633\u062A\u064A\u0631\u0627\u062F")} ${payload.length} ${t("\u0639\u0645\u064A\u0644 \u0628\u0646\u062C\u0627\u062D")}`;
      if (unknownRegions.length > 0) {
        msg += `

${t("\u062A\u0646\u0628\u064A\u0647: \u0627\u0644\u0645\u0646\u0627\u0637\u0642 \u062F\u064A \u0645\u0634 \u0645\u0639\u0631\u0648\u0641\u0629 \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645 \u0641\u0627\u062A\u0633\u0627\u0628\u062A \u0641\u0627\u0636\u064A\u0629 \u0644\u062D\u062F \u0645\u0627 \u0627\u0644\u0640 Admin \u064A\u0636\u064A\u0641\u0647\u0627 \u0645\u0646 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u2190 Regions:")} ${unknownRegions.join(", ")}`;
      }
      alert(msg);
      load();
    } catch (err) {
      alert(t("\u0641\u0634\u0644 \u0627\u0644\u0627\u0633\u062A\u064A\u0631\u0627\u062F: ") + err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }
  __name(handleImportFile, "handleImportFile");
  const filtered = rows.filter(
    (r) => r.name.toLowerCase().includes(search.toLowerCase()) || (r.sap_code || "").toLowerCase().includes(search.toLowerCase())
  );
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-5", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "font-display font-extrabold text-2xl", children: t("\u0627\u0644\u0639\u0645\u0644\u0627\u0621") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => setShowImportHelp(true), className: import_ui.btnSecondary, style: import_ui.btnSecondaryStyle, children: [
          "\u2B71 ",
          t("\u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0645\u0646 Excel")
        ] }),
        can("customers", "create") && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: openNew, className: import_ui.btnPrimary, style: import_ui.btnPrimaryStyle, children: [
          "+ ",
          t("\u0639\u0645\u064A\u0644 \u062C\u062F\u064A\u062F")
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { placeholder: t("\u0628\u062D\u062B \u0628\u0627\u0644\u0627\u0633\u0645 \u0623\u0648 \u0643\u0648\u062F SAP..."), className: `${import_ui.input} max-w-xs`, style: import_ui.inputStyle, value: search, onChange: (e) => setSearch(e.target.value) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `${import_ui.card} overflow-hidden overflow-x-auto`, style: import_ui.cardStyle, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "w-full", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u064A\u0644") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0645\u062E\u062A\u0635\u0631") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0643\u0648\u062F SAP") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u0645\u0646\u0637\u0642\u0629") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0645\u062D\u0644\u064A/\u062A\u0635\u062F\u064A\u0631") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("Owner") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { colSpan: 7, className: "px-3 py-8 text-center text-sm", style: { color: "var(--color-ink-soft)" }, children: t("...\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644") }) }) : filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { colSpan: 7, className: "px-3 py-8 text-center text-sm", style: { color: "var(--color-ink-soft)" }, children: t("\u0644\u0627 \u064A\u0648\u062C\u062F \u0639\u0645\u0644\u0627\u0621") }) }) : filtered.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: "border-t", style: { borderColor: "var(--color-border)" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} font-medium`, children: c.name }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: import_ui.td, children: c.short_name || "\u2014" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} font-mono text-xs`, style: { color: "var(--color-ink-soft)" }, children: c.sap_code || "\u2014" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: import_ui.td, children: c.region || "\u2014" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: import_ui.td, children: c.local_export || "\u2014" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: import_ui.td, children: c.owner_name || "\u2014" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: import_ui.td, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex gap-3 justify-end", children: [
          can("customers", "edit") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => openEdit(c), className: "text-xs font-semibold", style: { color: "var(--color-primary)" }, children: t("\u062A\u0639\u062F\u064A\u0644") }),
          can("customers", "delete") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => remove(c), className: "text-xs font-semibold", style: { color: "var(--color-danger)" }, children: t("\u062D\u0630\u0641") })
        ] }) })
      ] }, c.id)) })
    ] }) }),
    showForm && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_Modal.default, { title: t(editing ? "\u062A\u0639\u062F\u064A\u0644 \u0639\u0645\u064A\u0644" : "\u0639\u0645\u064A\u0644 \u062C\u062F\u064A\u062F"), onClose: () => setShowForm(false), children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: save, className: "space-y-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u064A\u0644 (Customer Name) *") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { required: true, className: import_ui.input, style: import_ui.inputStyle, value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0645\u062E\u062A\u0635\u0631 (Short Customer Name)") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: import_ui.input, style: import_ui.inputStyle, value: form.short_name, onChange: (e) => setForm({ ...form, short_name: e.target.value }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0643\u0648\u062F SAP") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: `${import_ui.input} font-mono`, style: import_ui.inputStyle, value: form.sap_code, onChange: (e) => setForm({ ...form, sap_code: e.target.value }), placeholder: "1000541" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0645\u062D\u0644\u064A / \u062A\u0635\u062F\u064A\u0631 (Local/Export)") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { className: import_ui.input, style: import_ui.inputStyle, value: form.local_export, onChange: (e) => setForm({ ...form, local_export: e.target.value }), children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "\u2014" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "Local", children: t("\u0645\u062D\u0644\u064A (Local)") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "Export", children: t("\u062A\u0635\u062F\u064A\u0631 (Export)") })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0627\u0644\u0645\u0646\u0637\u0642\u0629 (Region)") }),
        isAdmin ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { list: "regions-list", className: import_ui.input, style: import_ui.inputStyle, value: form.region, onChange: (e) => setForm({ ...form, region: e.target.value }), placeholder: t("West Africa, Egypt, South Asia...") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("datalist", { id: "regions-list", children: regions.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: r }, r)) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-xs mt-1", style: { color: "var(--color-ink-soft)" }, children: t("\u0628\u0635\u0641\u062A\u0643 Admin \u062A\u0642\u062F\u0631 \u062A\u0643\u062A\u0628 \u0645\u0646\u0637\u0642\u0629 \u062C\u062F\u064A\u062F\u0629 \u0647\u0646\u0627 \u0645\u0628\u0627\u0634\u0631\u0629\u060C \u0623\u0648 \u062A\u062F\u064A\u0631 \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0643\u0644\u0647\u0627 \u0645\u0646 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u2190 Regions") })
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { className: import_ui.input, style: import_ui.inputStyle, value: form.region, onChange: (e) => setForm({ ...form, region: e.target.value }), children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "\u2014" }),
            regions.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: r, children: r }, r))
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-xs mt-1", style: { color: "var(--color-ink-soft)" }, children: t("\u0644\u0648 \u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0644\u064A \u0645\u062D\u062A\u0627\u062C\u0647\u0627 \u0645\u0634 \u0645\u0648\u062C\u0648\u062F\u0629\u060C \u0627\u0637\u0644\u0628 \u0645\u0646 \u0627\u0644\u0640 Admin \u064A\u0636\u064A\u0641\u0647\u0627 \u0645\u0646 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u2190 Regions.") })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("Owner (\u0627\u0633\u0645 \u062D\u0631 \u0645\u0646 \u0627\u0644\u0634\u064A\u062A)") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: import_ui.input, style: import_ui.inputStyle, value: form.owner_name, onChange: (e) => setForm({ ...form, owner_name: e.target.value }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u062D\u0633\u0627\u0628 \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645 (\u0627\u062E\u062A\u064A\u0627\u0631\u064A)") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { className: import_ui.input, style: import_ui.inputStyle, value: form.account_manager_id, onChange: (e) => setForm({ ...form, account_manager_id: e.target.value }), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: t("\u0628\u062F\u0648\u0646 \u062A\u062D\u062F\u064A\u062F") }),
          managers.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: m.id, children: m.full_name || m.email }, m.id))
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex gap-2 pt-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", className: import_ui.btnPrimary, style: import_ui.btnPrimaryStyle, children: t("\u062D\u0641\u0638") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => setShowForm(false), className: import_ui.btnSecondary, style: import_ui.btnSecondaryStyle, children: t("\u0625\u0644\u063A\u0627\u0621") })
      ] })
    ] }) }),
    showImportHelp && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_Modal.default, { title: t("\u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0645\u0646 Excel"), onClose: () => setShowImportHelp(false), children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-4 text-sm", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { color: "var(--color-ink-soft)" }, children: t('\u064A\u064F\u0642\u0631\u0623 \u0645\u0646 \u0634\u064A\u062A \u0628\u0627\u0633\u0645 "Customer Master Data" \u0628\u0646\u0641\u0633 \u0639\u0646\u0627\u0648\u064A\u0646 \u0627\u0644\u0623\u0639\u0645\u062F\u0629:') }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `${import_ui.card} p-3 overflow-x-auto`, style: import_ui.cardStyle, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("table", { className: "w-full text-xs", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { style: { color: "var(--color-primary)" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "text-start p-1 font-bold", children: "SAP Customer Code" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "text-start p-1 font-bold", children: "Customer Name" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "text-start p-1 font-bold", children: "Short Customer Name" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "text-start p-1 font-bold", children: "Region" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "text-start p-1 font-bold", children: "Local/Export" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "text-start p-1 font-bold", children: "Owner" })
      ] }) }) }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", { className: "list-disc pr-4 space-y-1", style: { color: "var(--color-ink-soft)" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: t("\u0639\u0645\u0648\u062F Customer Name \u0625\u0644\u0632\u0627\u0645\u064A\u060C \u0627\u0644\u0628\u0627\u0642\u064A \u0627\u062E\u062A\u064A\u0627\u0631\u064A.") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: t("\u0644\u0648 \u062D\u0637\u064A\u062A SAP Customer Code \u0644\u0639\u0645\u064A\u0644 \u0645\u0648\u062C\u0648\u062F \u0628\u0627\u0644\u0641\u0639\u0644\u060C \u0628\u064A\u0627\u0646\u0627\u062A\u0647 \u0647\u062A\u062A\u062D\u062F\u0651\u062B \u0628\u062F\u0644 \u0645\u0627 \u064A\u062A\u0643\u0631\u0631.") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { ref: fileInputRef, type: "file", accept: ".xlsx,.xls", onChange: handleImportFile, disabled: importing, className: "text-sm" }),
      importing && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: "var(--color-ink-soft)" }, children: t("...\u062C\u0627\u0631\u064A \u0627\u0644\u0627\u0633\u062A\u064A\u0631\u0627\u062F") })
    ] }) })
  ] });
}
__name(Customers, "Customers");

});
