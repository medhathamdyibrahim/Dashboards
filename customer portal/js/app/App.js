// App.js — compiled from src/App.tsx (readable, unminified)
__modules__.define("App", function (module, exports, require) {
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
var App_exports = {};
__export(App_exports, {
  default: () => App
});
module.exports = __toCommonJS(App_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_react_router_dom = require("react-router-dom");
var import_AuthContext = require("./context/AuthContext");
var import_ThemeContext = require("./context/ThemeContext");
var import_LanguageContext = require("./context/LanguageContext");
var import_ProtectedRoute = __toESM(require("./components/ProtectedRoute"));
var import_Login = __toESM(require("./pages/Login"));
var import_Dashboard = __toESM(require("./pages/Dashboard"));
var import_Customers = __toESM(require("./pages/Customers"));
var import_Products = __toESM(require("./pages/Products"));
var import_Settings = __toESM(require("./pages/Settings"));
var import_List = __toESM(require("./pages/PurchaseOrders/List"));
var import_Form = __toESM(require("./pages/PurchaseOrders/Form"));
var import_List2 = __toESM(require("./pages/SalesOrders/List"));
var import_Form2 = __toESM(require("./pages/SalesOrders/Form"));
var import_List3 = __toESM(require("./pages/Dispatches/List"));
var import_Form3 = __toESM(require("./pages/Dispatches/Form"));
var import_List4 = __toESM(require("./pages/Invoices/List"));
var import_Form4 = __toESM(require("./pages/Invoices/Form"));
var import_List5 = __toESM(require("./pages/Collections/List"));
var import_Reports = __toESM(require("./pages/Reports"));
var import_List6 = __toESM(require("./pages/Audit/List"));
var import_List7 = __toESM(require("./pages/FxRates/List"));
function LoginGate() {
  const { userId, loading } = (0, import_AuthContext.useAuth)();
  const { t } = (0, import_LanguageContext.useLanguage)();
  if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "min-h-screen flex items-center justify-center", style: { color: "var(--color-ink-soft)" }, children: t("...\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644") });
  if (userId) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.Navigate, { to: "/", replace: true });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_Login.default, {});
}
__name(LoginGate, "LoginGate");
function App() {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ThemeContext.ThemeProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_LanguageContext.LanguageProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.HashRouter, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_AuthContext.AuthProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react_router_dom.Routes, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.Route, { path: "/login", element: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoginGate, {}) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.Route, { path: "/", element: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ProtectedRoute.default, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_Dashboard.default, {}) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.Route, { path: "/customers", element: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ProtectedRoute.default, { module: "customers", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_Customers.default, {}) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.Route, { path: "/products", element: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ProtectedRoute.default, { module: "products", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_Products.default, {}) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.Route, { path: "/purchase-orders", element: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ProtectedRoute.default, { module: "purchase_orders", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_List.default, {}) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.Route, { path: "/purchase-orders/new", element: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ProtectedRoute.default, { module: "purchase_orders", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_Form.default, {}) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.Route, { path: "/purchase-orders/:id/edit", element: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ProtectedRoute.default, { module: "purchase_orders", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_Form.default, {}) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.Route, { path: "/sales-orders", element: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ProtectedRoute.default, { module: "sales_orders", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_List2.default, {}) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.Route, { path: "/sales-orders/new", element: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ProtectedRoute.default, { module: "sales_orders", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_Form2.default, {}) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.Route, { path: "/sales-orders/:id/edit", element: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ProtectedRoute.default, { module: "sales_orders", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_Form2.default, {}) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.Route, { path: "/dispatches", element: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ProtectedRoute.default, { module: "dispatches", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_List3.default, {}) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.Route, { path: "/dispatches/new", element: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ProtectedRoute.default, { module: "dispatches", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_Form3.default, {}) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.Route, { path: "/dispatches/:id/edit", element: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ProtectedRoute.default, { module: "dispatches", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_Form3.default, {}) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.Route, { path: "/invoices", element: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ProtectedRoute.default, { module: "invoices", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_List4.default, {}) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.Route, { path: "/invoices/new", element: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ProtectedRoute.default, { module: "invoices", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_Form4.default, {}) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.Route, { path: "/invoices/:id/edit", element: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ProtectedRoute.default, { module: "invoices", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_Form4.default, {}) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.Route, { path: "/collections", element: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ProtectedRoute.default, { module: "payments", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_List5.default, {}) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.Route, { path: "/reports", element: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ProtectedRoute.default, { module: "reports", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_Reports.default, {}) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.Route, { path: "/audit", element: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ProtectedRoute.default, { adminOnly: true, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_List6.default, {}) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.Route, { path: "/fx-rates", element: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ProtectedRoute.default, { adminOnly: true, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_List7.default, {}) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.Route, { path: "/settings", element: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ProtectedRoute.default, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_Settings.default, {}) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.Route, { path: "*", element: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.Navigate, { to: "/", replace: true }) })
  ] }) }) }) }) });
}
__name(App, "App");

});
