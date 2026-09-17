// context/LanguageContext.js — compiled from src/context/LanguageContext.tsx (readable, unminified)
__modules__.define("context/LanguageContext", function (module, exports, require) {
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
var LanguageContext_exports = {};
__export(LanguageContext_exports, {
  LanguageProvider: () => LanguageProvider,
  useLanguage: () => useLanguage
});
module.exports = __toCommonJS(LanguageContext_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_react = require("react");
var import_translations = require("../lib/translations");
const LanguageContext = (0, import_react.createContext)(void 0);
const STORAGE_KEY = "app_lang";
function getInitialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "ar" || saved === "en") return saved;
  } catch {
  }
  return "ar";
}
__name(getInitialLang, "getInitialLang");
function LanguageProvider({ children }) {
  const [lang, setLangState] = (0, import_react.useState)(getInitialLang);
  const dir = lang === "ar" ? "rtl" : "ltr";
  (0, import_react.useEffect)(() => {
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", dir);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
    }
  }, [lang, dir]);
  function setLang(l) {
    setLangState(l);
  }
  __name(setLang, "setLang");
  function toggleLang() {
    setLangState((l) => l === "ar" ? "en" : "ar");
  }
  __name(toggleLang, "toggleLang");
  function t(arabicText) {
    if (lang === "ar") return arabicText;
    return import_translations.translations[arabicText] ?? arabicText;
  }
  __name(t, "t");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LanguageContext.Provider, { value: { lang, dir, toggleLang, setLang, t }, children });
}
__name(LanguageProvider, "LanguageProvider");
function useLanguage() {
  const ctx = (0, import_react.useContext)(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
__name(useLanguage, "useLanguage");

});
