// pages/Settings.js — compiled from src/pages/Settings.tsx (readable, unminified)
__modules__.define("pages/Settings", function (module, exports, require) {
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
var Settings_exports = {};
__export(Settings_exports, {
  default: () => Settings
});
module.exports = __toCommonJS(Settings_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_react = require("react");
var import_supabaseClient = require("../lib/supabaseClient");
var import_AuthContext = require("../context/AuthContext");
var import_LanguageContext = require("../context/LanguageContext");
var import_ui = require("../lib/ui");
var import_backup = require("../lib/backup");
var import_translations = require("../lib/translations");
const MODULES = [
  { key: "customers", label: "\u0627\u0644\u0639\u0645\u0644\u0627\u0621" },
  { key: "products", label: "\u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A" },
  { key: "purchase_orders", label: "\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621 (POs)" },
  { key: "sales_orders", label: "\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0628\u064A\u0639 (SO)" },
  { key: "dispatches", label: "\u0627\u0644\u0634\u062D\u0646\u0627\u062A" },
  { key: "invoices", label: "\u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631" },
  { key: "payments", label: "\u0627\u0644\u062A\u062D\u0635\u064A\u0644\u0627\u062A" },
  { key: "reports", label: "\u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631" }
];
const ACTIONS = [
  { key: "can_view", label: "\u0639\u0631\u0636" },
  { key: "can_create", label: "\u0625\u0636\u0627\u0641\u0629" },
  { key: "can_edit", label: "\u062A\u0639\u062F\u064A\u0644" },
  { key: "can_delete", label: "\u062D\u0630\u0641" },
  { key: "can_approve", label: "\u0645\u0648\u0627\u0641\u0642\u0629" }
];
function Settings() {
  const { isAdmin, profile: myProfile } = (0, import_AuthContext.useAuth)();
  const { t, lang } = (0, import_LanguageContext.useLanguage)();
  const [roles, setRoles] = (0, import_react.useState)([]);
  const [perms, setPerms] = (0, import_react.useState)([]);
  const [users, setUsers] = (0, import_react.useState)([]);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [activeRoleId, setActiveRoleId] = (0, import_react.useState)("");
  const [savingCell, setSavingCell] = (0, import_react.useState)(null);
  const [backupRunning, setBackupRunning] = (0, import_react.useState)(false);
  const [backupProgress, setBackupProgress] = (0, import_react.useState)(null);
  const [backupError, setBackupError] = (0, import_react.useState)(null);
  const [regions, setRegions] = (0, import_react.useState)([]);
  const [userRegions, setUserRegions] = (0, import_react.useState)({});
  const [newRegionName, setNewRegionName] = (0, import_react.useState)("");
  async function handleBackup() {
    setBackupRunning(true);
    setBackupError(null);
    setBackupProgress(null);
    try {
      const backup = await (0, import_backup.buildFullBackup)((p) => setBackupProgress(p));
      (0, import_backup.downloadBackupJson)(backup);
    } catch (e) {
      setBackupError(e instanceof Error ? e.message : String(e));
    } finally {
      setBackupRunning(false);
      setBackupProgress(null);
    }
  }
  __name(handleBackup, "handleBackup");
  async function load() {
    setLoading(true);
    const [rolesRes, permsRes, usersRes, regionsRes, userRegionsRes] = await Promise.all([
      import_supabaseClient.supabase.from("roles").select("*").order("is_system", { ascending: false }),
      import_supabaseClient.supabase.from("role_permissions").select("*"),
      import_supabaseClient.supabase.from("profiles").select("*, roles(*)").order("created_at"),
      import_supabaseClient.supabase.from("regions").select("*").order("name"),
      import_supabaseClient.supabase.from("user_regions").select("*")
    ]);
    const nonAdminRoles = (rolesRes.data || []).filter((r) => r.name !== "admin");
    setRoles(nonAdminRoles);
    setPerms(permsRes.data || []);
    setUsers(usersRes.data || []);
    setRegions(regionsRes.data || []);
    const byUser = {};
    for (const r of userRegionsRes.data || []) {
      byUser[r.profile_id] = [...byUser[r.profile_id] || [], r.region];
    }
    setUserRegions(byUser);
    if (!activeRoleId && nonAdminRoles.length) setActiveRoleId(nonAdminRoles[0].id);
    setLoading(false);
  }
  __name(load, "load");
  async function addRegion(e) {
    e.preventDefault();
    if (!newRegionName.trim()) return;
    await import_supabaseClient.supabase.from("regions").insert({ name: newRegionName.trim() });
    setNewRegionName("");
    load();
  }
  __name(addRegion, "addRegion");
  async function deleteRegion(name) {
    if (!confirm(`${t("\u062D\u0630\u0641 \u0645\u0646\u0637\u0642\u0629")} "${name}"\u061F ${t("\u0644\u0627\u0632\u0645 \u0645\u062A\u0628\u0642\u0627\u0634 \u0645\u0633\u062A\u062E\u062F\u0645\u0629 \u0641\u064A \u0623\u064A \u0639\u0645\u064A\u0644 \u0627\u0644\u0623\u0648\u0644.")}`)) return;
    const { error } = await import_supabaseClient.supabase.from("regions").delete().eq("name", name);
    if (error) {
      alert(t("\u062A\u0639\u0630\u0631 \u0627\u0644\u062D\u0630\u0641: ") + error.message);
      return;
    }
    load();
  }
  __name(deleteRegion, "deleteRegion");
  async function toggleAllRegions(userId, current) {
    await import_supabaseClient.supabase.from("profiles").update({ all_regions: !current }).eq("id", userId);
    load();
  }
  __name(toggleAllRegions, "toggleAllRegions");
  async function toggleUserRegion(userId, region, has) {
    if (has) await import_supabaseClient.supabase.from("user_regions").delete().eq("profile_id", userId).eq("region", region);
    else await import_supabaseClient.supabase.from("user_regions").insert({ profile_id: userId, region });
    load();
  }
  __name(toggleUserRegion, "toggleUserRegion");
  (0, import_react.useEffect)(() => {
    load();
  }, []);
  if (!isAdmin) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "rounded-2xl border p-6 text-sm", style: { background: "var(--color-danger-soft)", borderColor: "var(--color-border)", color: "var(--color-danger)" }, children: t("\u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062D\u0629 \u0645\u062A\u0627\u062D\u0629 \u0644\u0644\u0645\u062F\u064A\u0631 \u0641\u0642\u0637.") });
  }
  if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: "var(--color-ink-soft)" }, children: t("...\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644") });
  function permFor(roleId, module2) {
    return perms.find((p) => p.role_id === roleId && p.module === module2);
  }
  __name(permFor, "permFor");
  async function toggle(roleId, module2, action) {
    const cellKey = `${roleId}:${module2}:${action}`;
    setSavingCell(cellKey);
    const existing = permFor(roleId, module2);
    try {
      if (existing) {
        const next = !existing[action];
        await import_supabaseClient.supabase.from("role_permissions").update({ [action]: next }).eq("id", existing.id);
      } else {
        const base = { role_id: roleId, module: module2, can_view: false, can_create: false, can_edit: false, can_delete: false, can_approve: false };
        await import_supabaseClient.supabase.from("role_permissions").insert({ ...base, [action]: true });
      }
      await load();
    } finally {
      setSavingCell(null);
    }
  }
  __name(toggle, "toggle");
  async function updateUserRole(userId, roleId) {
    await import_supabaseClient.supabase.from("profiles").update({ role_id: roleId || null }).eq("id", userId);
    load();
  }
  __name(updateUserRole, "updateUserRole");
  async function toggleActive(userId, isActive) {
    await import_supabaseClient.supabase.from("profiles").update({ is_active: !isActive }).eq("id", userId);
    load();
  }
  __name(toggleActive, "toggleActive");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-6", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "font-display font-extrabold text-2xl", children: t("\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0648\u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0627\u062A") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `${import_ui.card} p-5`, style: import_ui.cardStyle, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "font-display font-bold mb-3", children: t("\u0645\u0635\u0641\u0648\u0641\u0629 \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0627\u062A") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex gap-2 mb-4", children: roles.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          onClick: () => setActiveRoleId(r.id),
          className: "px-3.5 py-1.5 rounded-lg text-sm font-semibold border",
          style: {
            background: activeRoleId === r.id ? "var(--color-primary)" : "transparent",
            color: activeRoleId === r.id ? "#fff" : "var(--color-ink)",
            borderColor: activeRoleId === r.id ? "var(--color-primary)" : "var(--color-border)"
          },
          children: (0, import_translations.roleLabel)(r, lang)
        },
        r.id
      )) }),
      activeRoleId && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "w-full", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u0642\u0633\u0645") }),
          ACTIONS.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: `${import_ui.th} text-center`, style: import_ui.thStyle, children: t(a.label) }, a.key))
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: MODULES.map((m) => {
          const p = permFor(activeRoleId, m.key);
          return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: "border-t", style: { borderColor: "var(--color-border)" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} font-medium`, children: t(m.label) }),
            ACTIONS.map((a) => {
              const cellKey = `${activeRoleId}:${m.key}:${a.key}`;
              const checked = p ? p[a.key] : false;
              return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} text-center`, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "input",
                {
                  type: "checkbox",
                  checked,
                  disabled: savingCell === cellKey,
                  onChange: () => toggle(activeRoleId, m.key, a.key),
                  className: "w-4 h-4 cursor-pointer",
                  style: { accentColor: "var(--color-primary)" }
                }
              ) }, a.key);
            })
          ] }, m.key);
        }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-xs mt-3", style: { color: "var(--color-ink-soft)" }, children: t('"\u0645\u062F\u064A\u0631 \u0627\u0644\u0646\u0638\u0627\u0645" \u062F\u0627\u064A\u0645\u064B\u0627 \u0644\u0647 \u0635\u0644\u0627\u062D\u064A\u0629 \u0643\u0627\u0645\u0644\u0629 \u0639\u0644\u0649 \u0643\u0644 \u0627\u0644\u0623\u0642\u0633\u0627\u0645 \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627 \u0648\u0644\u0627 \u064A\u0638\u0647\u0631 \u0647\u0646\u0627.') })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `${import_ui.card} p-5`, style: import_ui.cardStyle, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "font-display font-bold mb-3", children: t("\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u0648\u0646") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "w-full", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u0627\u0633\u0645") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u062F\u0648\u0631") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u062D\u0627\u0644\u0629") })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: users.map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: "border-t", style: { borderColor: "var(--color-border)" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: import_ui.td, children: [
            u.full_name || "\u2014",
            " ",
            u.id === myProfile?.id && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "text-xs", style: { color: "var(--color-ink-soft)" }, children: [
              "(",
              t("\u0623\u0646\u062A"),
              ")"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: import_ui.td, children: u.email }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: import_ui.td, children: u.roles?.name === "admin" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-sm font-semibold", style: { color: "var(--color-accent)" }, children: t("\u0645\u062F\u064A\u0631 \u0627\u0644\u0646\u0638\u0627\u0645") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { className: import_ui.input, style: { ...import_ui.inputStyle, width: "auto" }, value: u.role_id || "", onChange: (e) => updateUserRole(u.id, e.target.value), children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: t("\u0628\u062F\u0648\u0646 \u0635\u0644\u0627\u062D\u064A\u0629") }),
            roles.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: r.id, children: (0, import_translations.roleLabel)(r, lang) }, r.id))
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: import_ui.td, children: u.roles?.name === "admin" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs", style: { color: "var(--color-ink-soft)" }, children: "\u2014" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => toggleActive(u.id, u.is_active), className: import_ui.btnSecondary, style: { ...import_ui.btnSecondaryStyle, padding: "4px 12px" }, children: t(u.is_active ? "\u0625\u064A\u0642\u0627\u0641 \u0627\u0644\u062D\u0633\u0627\u0628" : "\u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u062D\u0633\u0627\u0628") }) })
        ] }, u.id)) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-xs mt-3", style: { color: "var(--color-ink-soft)" }, children: t("\u0623\u0648\u0644 \u0645\u0633\u062A\u062E\u062F\u0645 \u064A\u0633\u062C\u0644 \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645 \u064A\u0635\u0628\u062D \u0645\u062F\u064A\u0631\u064B\u0627 \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627. \u0623\u064A \u0645\u0633\u062A\u062E\u062F\u0645 \u062C\u062F\u064A\u062F \u0628\u0639\u062F \u0643\u062F\u0647 \u0647\u064A\u0641\u0636\u0644 \u0645\u0646 \u063A\u064A\u0631 \u0635\u0644\u0627\u062D\u064A\u0629 \u0644\u062D\u062F \u0645\u0627 \u062A\u062D\u062F\u062F \u0644\u0647 \u062F\u0648\u0631 \u0645\u0646 \u0647\u0646\u0627.") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `${import_ui.card} p-5`, style: import_ui.cardStyle, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "font-display font-bold mb-1", children: t("\u0627\u0644\u0645\u0646\u0627\u0637\u0642 (Regions) \u2014 \u0644\u0644\u0645\u062F\u064A\u0631 \u0641\u0642\u0637") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-xs mb-4", style: { color: "var(--color-ink-soft)" }, children: t('\u0643\u0644 \u0645\u0633\u062A\u062E\u062F\u0645 \u0639\u0646\u062F\u0647 Region \u0648\u0627\u062D\u062F\u0629 \u0623\u0648 \u0623\u0643\u062A\u0631 (\u0623\u0648 "\u0643\u0644 \u0627\u0644\u0645\u0646\u0627\u0637\u0642"). \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0644\u064A \u0645\u0639\u0627\u0647 Region \u0645\u062D\u062F\u062F\u0629 \u0645\u0634 \u0647\u064A\u0642\u062F\u0631 \u064A\u0634\u0648\u0641 \u0648\u0644\u0627 \u064A\u0639\u062F\u0651\u0644 \u0623\u064A \u0639\u0645\u064A\u0644 \u0623\u0648 PO \u0623\u0648 SO \u0623\u0648 \u0634\u062D\u0646\u0629 \u0623\u0648 \u0641\u0627\u062A\u0648\u0631\u0629 \u0623\u0648 \u062A\u062D\u0635\u064A\u0644 \u062A\u0627\u0628\u0639 \u0644\u0645\u0646\u0637\u0642\u0629 \u062A\u0627\u0646\u064A\u0629.') }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: addRegion, className: "flex gap-2 mb-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: import_ui.input, style: { ...import_ui.inputStyle, maxWidth: 220 }, placeholder: t("\u0627\u0633\u0645 \u0645\u0646\u0637\u0642\u0629 \u062C\u062F\u064A\u062F\u0629..."), value: newRegionName, onChange: (e) => setNewRegionName(e.target.value) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "submit", className: import_ui.btnSecondary, style: import_ui.btnSecondaryStyle, children: [
          "+ ",
          t("\u0625\u0636\u0627\u0641\u0629 \u0645\u0646\u0637\u0642\u0629")
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-wrap gap-2 mb-5", children: [
        regions.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1.5 border", style: { borderColor: "var(--color-border)" }, children: [
          r.name,
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => deleteRegion(r.name), className: "opacity-60 hover:opacity-100", style: { color: "var(--color-danger)" }, children: "\xD7" })
        ] }, r.id)),
        regions.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs", style: { color: "var(--color-ink-soft)" }, children: t("\u0644\u0633\u0647 \u0645\u0641\u064A\u0634 \u0645\u0646\u0627\u0637\u0642 \u2014 \u0628\u062A\u062A\u0636\u0627\u0641 \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627 \u0623\u0648\u0644 \u0645\u0627 \u062A\u062D\u062F\u062F Region \u0644\u0639\u0645\u064A\u0644\u060C \u0623\u0648 \u0636\u064A\u0641\u0647\u0627 \u0647\u0646\u0627 \u064A\u062F\u0648\u064A\u064B\u0627.") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "w-full", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: `${import_ui.th} text-center`, style: import_ui.thStyle, children: t("\u0643\u0644 \u0627\u0644\u0645\u0646\u0627\u0637\u0642") }),
          regions.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: `${import_ui.th} text-center`, style: import_ui.thStyle, children: r.name }, r.id))
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: users.filter((u) => u.roles?.name !== "admin").map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: "border-t", style: { borderColor: "var(--color-border)" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} font-medium`, children: u.full_name || u.email }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} text-center`, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              type: "checkbox",
              checked: !!u.all_regions,
              onChange: () => toggleAllRegions(u.id, !!u.all_regions),
              className: "w-4 h-4 cursor-pointer",
              style: { accentColor: "var(--color-primary)" }
            }
          ) }),
          regions.map((r) => {
            const has = (userRegions[u.id] || []).includes(r.name);
            return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} text-center`, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                type: "checkbox",
                checked: has,
                disabled: !!u.all_regions,
                onChange: () => toggleUserRegion(u.id, r.name, has),
                className: "w-4 h-4 cursor-pointer",
                style: { accentColor: "var(--color-primary)" }
              }
            ) }, r.id);
          })
        ] }, u.id)) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-xs mt-3", style: { color: "var(--color-ink-soft)" }, children: t('"\u0645\u062F\u064A\u0631 \u0627\u0644\u0646\u0638\u0627\u0645" \u0634\u0627\u064A\u0641 \u0643\u0644 \u0627\u0644\u0645\u0646\u0627\u0637\u0642 \u062F\u0627\u064A\u0645\u064B\u0627. \u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0639\u0644\u0627\u0645\u0629 "\u0643\u0644 \u0627\u0644\u0645\u0646\u0627\u0637\u0642" \u0645\u0641\u0639\u0651\u0644\u0629 \u064A\u0634\u0648\u0641 \u0643\u0644 \u062D\u0627\u062C\u0629 \u0628\u063A\u0636 \u0627\u0644\u0646\u0638\u0631 \u0639\u0646 \u0627\u0644\u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u062A\u0627\u0646\u064A\u0629.') })
    ] }),
    isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: import_ui.card, style: import_ui.cardStyle, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "p-5", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "font-display font-bold mb-1", children: t("\u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A (Backup)") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-xs mb-4", style: { color: "var(--color-ink-soft)" }, children: t("\u064A\u0642\u0648\u0645 \u0628\u062A\u0635\u062F\u064A\u0631 \u0643\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0646\u0638\u0627\u0645 (\u0627\u0644\u0639\u0645\u0644\u0627\u0621\u060C \u0627\u0644\u0641\u0631\u0635\u060C \u0639\u0631\u0648\u0636 \u0627\u0644\u0623\u0633\u0639\u0627\u0631\u060C \u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0628\u064A\u0639\u060C \u0627\u0644\u0634\u062D\u0646\u0627\u062A\u060C \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631\u060C \u0627\u0644\u062A\u062D\u0635\u064A\u0644\u0627\u062A...) \u0641\u064A \u0645\u0644\u0641 JSON \u0648\u0627\u062D\u062F \u064A\u0645\u0643\u0646 \u062D\u0641\u0638\u0647 \u0623\u0648 \u0623\u0631\u0634\u0641\u062A\u0647. \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0634\u0641\u0651\u0631\u0629 (\u0645\u062B\u0644 \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A) \u064A\u062A\u0645 \u0641\u0643 \u062A\u0634\u0641\u064A\u0631\u0647\u0627 \u0641\u064A \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0646\u0627\u062A\u062C \u0644\u064A\u0643\u0648\u0646 \u0642\u0627\u0628\u0644\u0627\u064B \u0644\u0644\u0642\u0631\u0627\u0621\u0629 \u0648\u0627\u0644\u0627\u0633\u062A\u0639\u0627\u062F\u0629.") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: handleBackup, disabled: backupRunning, className: import_ui.btnPrimary, style: import_ui.btnPrimaryStyle, children: backupRunning ? `${t("...\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u0635\u062F\u064A\u0631")} ${backupProgress ? `(${backupProgress.done}/${backupProgress.total})` : ""}` : `\u2B07 ${t("\u062A\u0635\u062F\u064A\u0631 \u0646\u0633\u062E\u0629 \u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u0643\u0627\u0645\u0644\u0629")}` }),
      backupError && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "text-sm mt-3", style: { color: "var(--color-danger)" }, children: [
        "\u274C ",
        backupError
      ] })
    ] }) })
  ] });
}
__name(Settings, "Settings");

});
