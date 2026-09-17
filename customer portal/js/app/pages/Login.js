// pages/Login.js — compiled from src/pages/Login.tsx (readable, unminified)
__modules__.define("pages/Login", function (module, exports, require) {
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
var Login_exports = {};
__export(Login_exports, {
  default: () => Login
});
module.exports = __toCommonJS(Login_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_react = require("react");
var import_react_router_dom = require("react-router-dom");
var import_supabaseClient = require("../lib/supabaseClient");
var import_LanguageContext = require("../context/LanguageContext");
var import_ui = require("../lib/ui");
function getInitialRemember() {
  try {
    return localStorage.getItem(import_supabaseClient.REMEMBER_ME_KEY) !== "false";
  } catch {
    return true;
  }
}
__name(getInitialRemember, "getInitialRemember");
function Login() {
  const { t, dir } = (0, import_LanguageContext.useLanguage)();
  const [mode, setMode] = (0, import_react.useState)("login");
  const [email, setEmail] = (0, import_react.useState)("");
  const [password, setPassword] = (0, import_react.useState)("");
  const [fullName, setFullName] = (0, import_react.useState)("");
  const [remember, setRemember] = (0, import_react.useState)(getInitialRemember);
  const [error, setError] = (0, import_react.useState)("");
  const [info, setInfo] = (0, import_react.useState)("");
  const [loading, setLoading] = (0, import_react.useState)(false);
  const navigate = (0, import_react_router_dom.useNavigate)();
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    (0, import_supabaseClient.setRememberMe)(remember);
    try {
      if (mode === "login") {
        const { error: error2 } = await import_supabaseClient.supabase.auth.signInWithPassword({ email, password });
        if (error2) throw error2;
        navigate("/");
      } else {
        const { error: error2 } = await import_supabaseClient.supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });
        if (error2) throw error2;
        setInfo(t("\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062D\u0633\u0627\u0628. \u0623\u0648\u0644 \u0645\u0633\u062A\u062E\u062F\u0645 \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645 \u064A\u0635\u0628\u062D \u0645\u062F\u064A\u0631\u064B\u0627 \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627\u061B \u063A\u064A\u0631 \u0630\u0644\u0643 \u0627\u0646\u062A\u0638\u0631 \u062A\u0641\u0639\u064A\u0644 \u0635\u0644\u0627\u062D\u064A\u0627\u062A\u0643 \u0645\u0646 \u0627\u0644\u0645\u062F\u064A\u0631."));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  __name(handleSubmit, "handleSubmit");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "min-h-screen flex items-center justify-center px-4", dir, style: { background: "var(--color-bg)" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "w-full max-w-sm rounded-2xl border shadow-sm p-7", style: { background: "var(--color-surface)", borderColor: "var(--color-border)" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "font-display font-extrabold text-xl mb-1", style: { color: "var(--color-primary-dark)" }, children: "ModuPay CRM" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-sm mb-6", style: { color: "var(--color-ink-soft)" }, children: t("CRM + \u062A\u062A\u0628\u0639 \u0627\u0644\u0641\u0631\u0635 \u0648\u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
      mode === "signup" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0627\u0644\u0627\u0633\u0645 \u0628\u0627\u0644\u0643\u0627\u0645\u0644") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: import_ui.input, style: import_ui.inputStyle, value: fullName, onChange: (e) => setFullName(e.target.value), required: true })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "email", className: import_ui.input, style: import_ui.inputStyle, value: email, onChange: (e) => setEmail(e.target.value), required: true })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "password", className: import_ui.input, style: import_ui.inputStyle, value: password, onChange: (e) => setPassword(e.target.value), required: true, minLength: 6 })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "flex items-center gap-2 text-sm cursor-pointer select-none", style: { color: "var(--color-ink-soft)" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            type: "checkbox",
            checked: remember,
            onChange: (e) => setRemember(e.target.checked),
            className: "w-4 h-4 cursor-pointer",
            style: { accentColor: "var(--color-primary)" }
          }
        ),
        t("\u062A\u0630\u0643\u0631\u0646\u064A")
      ] }),
      error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-sm rounded-lg px-3 py-2", style: { background: "var(--color-danger-soft)", color: "var(--color-danger)" }, children: error }),
      info && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-sm rounded-lg px-3 py-2", style: { background: "var(--color-primary-soft)", color: "var(--color-primary-dark)" }, children: info }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", disabled: loading, className: `${import_ui.btnPrimary} w-full`, style: import_ui.btnPrimaryStyle, children: loading ? t("...\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644") : mode === "login" ? t("\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644") : t("\u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "button",
      {
        onClick: () => {
          setMode(mode === "login" ? "signup" : "login");
          setError("");
          setInfo("");
        },
        className: "w-full text-center text-sm mt-4 font-medium",
        style: { color: "var(--color-primary)" },
        children: mode === "login" ? t("\u0644\u064A\u0633 \u0644\u062F\u064A\u0643 \u062D\u0633\u0627\u0628\u061F \u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628 \u062C\u062F\u064A\u062F") : t("\u0644\u062F\u064A\u0643 \u062D\u0633\u0627\u0628 \u0628\u0627\u0644\u0641\u0639\u0644\u061F \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644")
      }
    )
  ] }) });
}
__name(Login, "Login");

});
