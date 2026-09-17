// pages/Dashboard.js — compiled from src/pages/Dashboard.tsx (readable, unminified)
__modules__.define("pages/Dashboard", function (module, exports, require) {
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
var Dashboard_exports = {};
__export(Dashboard_exports, {
  default: () => Dashboard
});
module.exports = __toCommonJS(Dashboard_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_react_router_dom = require("react-router-dom");
var import_AuthContext = require("../context/AuthContext");
var import_LanguageContext = require("../context/LanguageContext");
var import_ui = require("../lib/ui");
const QUICK_ACTIONS = [
  { to: "/purchase-orders/new", label: "PO \u062C\u062F\u064A\u062F", module: "purchase_orders", icon: "\u2460" },
  { to: "/sales-orders/new", label: "\u0623\u0645\u0631 \u0628\u064A\u0639 \u062C\u062F\u064A\u062F", module: "sales_orders", icon: "\u2461" },
  { to: "/dispatches/new", label: "\u0634\u062D\u0646\u0629 \u062C\u062F\u064A\u062F\u0629", module: "dispatches", icon: "\u2462" },
  { to: "/invoices/new", label: "\u0641\u0627\u062A\u0648\u0631\u0629 \u062C\u062F\u064A\u062F\u0629", module: "invoices", icon: "\u2463" },
  { to: "/collections", label: "\u062A\u0633\u062C\u064A\u0644 \u062A\u062D\u0635\u064A\u0644", module: "payments", icon: "\u2464" },
  { to: "/reports", label: "\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u0639\u0645\u0644\u0627\u0621", module: "reports", icon: "\u25A4" }
];
function Dashboard() {
  const { profile, can } = (0, import_AuthContext.useAuth)();
  const { t } = (0, import_LanguageContext.useLanguage)();
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-6", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { className: "font-display font-extrabold text-2xl", children: [
        t("\u0623\u0647\u0644\u064B\u0627\u060C"),
        " ",
        profile?.full_name || profile?.email,
        " \u{1F44B}"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-sm mt-1", style: { color: "var(--color-ink-soft)" }, children: t("\u0627\u0628\u062F\u0623 \u0645\u0646 \u0647\u0646\u0627.") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `${import_ui.card} p-5`, style: import_ui.cardStyle, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "font-display font-bold mb-3", children: t("\u0625\u062C\u0631\u0627\u0621 \u0633\u0631\u064A\u0639") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-3", children: QUICK_ACTIONS.filter((a) => can(a.module, a.module === "reports" ? "view" : "create")).map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        import_react_router_dom.Link,
        {
          to: a.to,
          className: "flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition-colors hover:text-white",
          style: { borderColor: "var(--color-border)" },
          onMouseEnter: (e) => {
            e.currentTarget.style.background = import_ui.BRAND_BLUE;
            e.currentTarget.style.color = "#fff";
          },
          onMouseLeave: (e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "";
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "opacity-70", children: a.icon }),
            " ",
            a.module === "reports" ? "" : "+",
            " ",
            t(a.label)
          ]
        },
        a.to
      )) })
    ] })
  ] });
}
__name(Dashboard, "Dashboard");

});
