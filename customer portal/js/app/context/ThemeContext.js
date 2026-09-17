// context/ThemeContext.js — compiled from src/context/ThemeContext.tsx (readable, unminified)
__modules__.define("context/ThemeContext", function (module, exports, require) {
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
var ThemeContext_exports = {};
__export(ThemeContext_exports, {
  ThemeProvider: () => ThemeProvider,
  useTheme: () => useTheme
});
module.exports = __toCommonJS(ThemeContext_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_react = require("react");
const ThemeContext = (0, import_react.createContext)(void 0);
const STORAGE_KEY = "app_theme";
function getInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
  }
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}
__name(getInitialTheme, "getInitialTheme");
function ThemeProvider({ children }) {
  const [theme, setTheme] = (0, import_react.useState)(getInitialTheme);
  (0, import_react.useEffect)(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
    }
  }, [theme]);
  function toggleTheme() {
    setTheme((t) => t === "light" ? "dark" : "light");
  }
  __name(toggleTheme, "toggleTheme");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeContext.Provider, { value: { theme, toggleTheme }, children });
}
__name(ThemeProvider, "ThemeProvider");
function useTheme() {
  const ctx = (0, import_react.useContext)(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
__name(useTheme, "useTheme");

});
