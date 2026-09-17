// components/Layout.js — compiled from src/components/Layout.tsx (readable, unminified)
__modules__.define("components/Layout", function (module, exports, require) {
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
var Layout_exports = {};
__export(Layout_exports, {
  default: () => Layout
});
module.exports = __toCommonJS(Layout_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_react = require("react");
var import_react_router_dom = require("react-router-dom");
var import_AuthContext = require("../context/AuthContext");
var import_ThemeContext = require("../context/ThemeContext");
var import_LanguageContext = require("../context/LanguageContext");
var import_translations = require("../lib/translations");
const NAV = [
  { to: "/", label: "\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629", icon: "\u25C8", module: null },
  {
    group: "\u0628\u064A\u0627\u0646\u0627\u062A \u0623\u0633\u0627\u0633\u064A\u0629",
    icon: "\u25A6",
    items: [
      { to: "/customers", label: "\u0627\u0644\u0639\u0645\u0644\u0627\u0621", icon: "\u25D4", module: "customers" },
      { to: "/products", label: "\u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A", icon: "\u25EB", module: "products" }
    ]
  },
  { to: "/purchase-orders", label: "\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621 (POs)", icon: "\u2460", module: "purchase_orders" },
  { to: "/sales-orders", label: "\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0628\u064A\u0639 (SO)", icon: "\u2461", module: "sales_orders" },
  { to: "/dispatches", label: "\u0627\u0644\u0634\u062D\u0646\u0627\u062A", icon: "\u2462", module: "dispatches" },
  { to: "/invoices", label: "\u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631", icon: "\u2463", module: "invoices" },
  { to: "/collections", label: "\u0627\u0644\u062A\u062D\u0635\u064A\u0644\u0627\u062A", icon: "\u2464", module: "payments" },
  { to: "/reports", label: "\u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631", icon: "\u25A4", module: "reports" },
  { to: "/audit", label: "\u0633\u062C\u0644 \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629 (Audit Trail)", icon: "\u{1F558}", module: null, adminOnly: true },
  { to: "/fx-rates", label: "\u0623\u0633\u0639\u0627\u0631 \u0627\u0644\u0635\u0631\u0641 (FX Rates)", icon: "\u{1F4B1}", module: null, adminOnly: true },
  { to: "/settings", label: "\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0648\u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0627\u062A", icon: "\u2699", module: "settings" }
];
function isGroup(entry) {
  return "group" in entry;
}
__name(isGroup, "isGroup");
function NavItem({ item, isActive, t }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    import_react_router_dom.NavLink,
    {
      to: item.to,
      end: item.to === "/",
      className: "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--color-bg)]",
      style: {
        background: isActive ? "var(--color-primary-soft)" : "transparent",
        color: isActive ? "var(--color-primary-dark)" : "var(--color-ink)"
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-5 text-center opacity-70", children: item.icon }),
        t(item.label)
      ]
    }
  );
}
__name(NavItem, "NavItem");
function Layout({ children }) {
  const { profile, isAdmin, can, signOut } = (0, import_AuthContext.useAuth)();
  const { theme, toggleTheme } = (0, import_ThemeContext.useTheme)();
  const { lang, toggleLang, t } = (0, import_LanguageContext.useLanguage)();
  const navigate = (0, import_react_router_dom.useNavigate)();
  const location = (0, import_react_router_dom.useLocation)();
  function visible(n) {
    if (n.adminOnly) return isAdmin;
    return !n.module || isAdmin || can(n.module, "view");
  }
  __name(visible, "visible");
  const [openGroups, setOpenGroups] = (0, import_react.useState)(() => {
    try {
      const saved = localStorage.getItem("nav_open_groups");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  function toggleGroup(name) {
    setOpenGroups((prev) => {
      const next = { ...prev, [name]: !prev[name] };
      try {
        localStorage.setItem("nav_open_groups", JSON.stringify(next));
      } catch {
      }
      return next;
    });
  }
  __name(toggleGroup, "toggleGroup");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "min-h-screen flex", dir: lang === "ar" ? "rtl" : "ltr", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "aside",
      {
        className: "w-64 shrink-0 flex flex-col border-e",
        style: { background: "var(--color-surface)", borderColor: "var(--color-border)" },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "px-5 py-5 border-b flex items-start justify-between gap-2", style: { borderColor: "var(--color-border)" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "font-display font-extrabold text-lg", style: { color: "var(--color-primary-dark)" }, children: "ModuPay CRM" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-xs mt-0.5", style: { color: "var(--color-ink-soft)" }, children: t("PO \u2190 \u0623\u0645\u0631 \u0628\u064A\u0639 \u2190 \u0634\u062D\u0646 \u2190 \u0641\u0627\u062A\u0648\u0631\u0629 \u2190 \u062A\u062D\u0635\u064A\u0644") })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "px-3 py-3 flex items-center gap-2 border-b", style: { borderColor: "var(--color-border)" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "button",
              {
                onClick: toggleTheme,
                className: "flex-1 flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg px-2 py-1.5 hover:bg-[var(--color-bg)]",
                style: { border: "1px solid var(--color-border)", color: "var(--color-ink-soft)" },
                title: t("\u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u062F\u0627\u0643\u0646"),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: theme === "dark" ? "\u2600" : "\u263E" }),
                  theme === "dark" ? t("\u0641\u0627\u062A\u062D") : t("\u062F\u0627\u0643\u0646")
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "button",
              {
                onClick: toggleLang,
                className: "flex-1 flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg px-2 py-1.5 hover:bg-[var(--color-bg)]",
                style: { border: "1px solid var(--color-border)", color: "var(--color-ink-soft)" },
                title: t("\u0627\u0644\u0644\u063A\u0629"),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u{1F310}" }),
                  lang === "ar" ? "EN" : "\u0639\u0631\u0628\u064A"
                ]
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", { className: "flex-1 overflow-y-auto py-3 px-2 space-y-0.5", children: NAV.map((entry) => {
            if (isGroup(entry)) {
              const visibleItems = entry.items.filter(visible);
              if (visibleItems.length === 0) return null;
              const isOpen = !!openGroups[entry.group];
              const groupHasActive = visibleItems.some((i) => location.pathname.startsWith(i.to));
              return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                  "button",
                  {
                    onClick: () => toggleGroup(entry.group),
                    className: "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-[var(--color-bg)]",
                    style: { color: groupHasActive ? "var(--color-primary-dark)" : "var(--color-ink-soft)" },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-5 text-center opacity-70", children: entry.icon }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "flex-1 text-start", children: t(entry.group) }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs transition-transform", style: { transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }, children: "\u2039" })
                    ]
                  }
                ),
                isOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ms-9 border-s ps-3 space-y-0.5", style: { borderColor: "var(--color-border)" }, children: visibleItems.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavItem, { item, isActive: location.pathname.startsWith(item.to) && (item.to !== "/" || location.pathname === "/"), t }, item.to)) })
              ] }, entry.group);
            }
            if (!visible(entry)) return null;
            const isActive = entry.to === "/" ? location.pathname === "/" : location.pathname.startsWith(entry.to);
            return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavItem, { item: entry, isActive, t }, entry.to);
          }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "p-3 border-t text-sm", style: { borderColor: "var(--color-border)" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "px-2 py-1.5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "font-medium truncate", children: profile?.full_name || profile?.email }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-xs", style: { color: "var(--color-ink-soft)" }, children: profile?.roles ? (0, import_translations.roleLabel)(profile.roles, lang) : t("\u0628\u062F\u0648\u0646 \u0635\u0644\u0627\u062D\u064A\u0629") })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                onClick: async () => {
                  await signOut();
                  navigate("/login");
                },
                className: "w-full mt-1 text-start px-2 py-2 rounded-lg text-sm hover:bg-[var(--color-bg)]",
                style: { color: "var(--color-danger)" },
                children: t("\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C")
              }
            )
          ] })
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", { className: "flex-1 min-w-0", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "max-w-6xl mx-auto px-6 py-6", children }) })
  ] });
}
__name(Layout, "Layout");

});
