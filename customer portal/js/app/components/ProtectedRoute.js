// components/ProtectedRoute.js — compiled from src/components/ProtectedRoute.tsx (readable, unminified)
__modules__.define("components/ProtectedRoute", function (module, exports, require) {
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
var ProtectedRoute_exports = {};
__export(ProtectedRoute_exports, {
  default: () => ProtectedRoute
});
module.exports = __toCommonJS(ProtectedRoute_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_react_router_dom = require("react-router-dom");
var import_AuthContext = require("../context/AuthContext");
var import_LanguageContext = require("../context/LanguageContext");
var import_Layout = __toESM(require("./Layout"));
function ProtectedRoute({ children, module: module2, adminOnly }) {
  const { loading, userId, isAdmin, can, profile } = (0, import_AuthContext.useAuth)();
  const { t } = (0, import_LanguageContext.useLanguage)();
  if (loading) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "min-h-screen flex items-center justify-center", style: { color: "var(--color-ink-soft)" }, children: t("...\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644") });
  }
  if (!userId) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.Navigate, { to: "/login", replace: true });
  if (!profile?.role_id) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_Layout.default, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "rounded-2xl border p-6 text-sm", style: { background: "var(--color-accent-soft)", borderColor: "var(--color-border)" }, children: t("\u062D\u0633\u0627\u0628\u0643 \u062A\u0645 \u0625\u0646\u0634\u0627\u0624\u0647 \u0644\u0643\u0646 \u0644\u0633\u0647 \u0645\u0627\u062A\u062D\u062F\u062F\u0644\u0648\u0634 \u0635\u0644\u0627\u062D\u064A\u0629. \u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0645\u062F\u064A\u0631 \u0627\u0644\u0646\u0638\u0627\u0645 \u0639\u0634\u0627\u0646 \u064A\u0641\u0639\u0651\u0644 \u062D\u0633\u0627\u0628\u0643 \u0645\u0646 \u0634\u0627\u0634\u0629 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A.") }) });
  }
  if (adminOnly && !isAdmin) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_Layout.default, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "rounded-2xl border p-6 text-sm", style: { background: "var(--color-danger-soft)", borderColor: "var(--color-border)", color: "var(--color-danger)" }, children: t("\u0647\u0630\u0647 \u0627\u0644\u0634\u0627\u0634\u0629 \u0645\u062A\u0627\u062D\u0629 \u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0646\u0638\u0627\u0645 \u0641\u0642\u0637.") }) });
  }
  if (module2 && !isAdmin && !can(module2, "view")) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_Layout.default, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "rounded-2xl border p-6 text-sm", style: { background: "var(--color-danger-soft)", borderColor: "var(--color-border)", color: "var(--color-danger)" }, children: t("\u0644\u0627 \u062A\u0645\u0644\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u0639\u0631\u0636 \u0647\u0630\u0627 \u0627\u0644\u0642\u0633\u0645.") }) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_Layout.default, { children });
}
__name(ProtectedRoute, "ProtectedRoute");

});
