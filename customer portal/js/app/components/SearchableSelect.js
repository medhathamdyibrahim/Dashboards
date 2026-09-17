// components/SearchableSelect.js — compiled from src/components/SearchableSelect.tsx (readable, unminified)
__modules__.define("components/SearchableSelect", function (module, exports, require) {
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
var SearchableSelect_exports = {};
__export(SearchableSelect_exports, {
  default: () => SearchableSelect
});
module.exports = __toCommonJS(SearchableSelect_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_react = require("react");
var import_LanguageContext = require("../context/LanguageContext");
var import_ui = require("../lib/ui");
function SearchableSelect({
  value,
  options,
  getId,
  getLabel,
  getSubLabel,
  matches,
  onChange,
  placeholder
}) {
  const { t } = (0, import_LanguageContext.useLanguage)();
  const [query, setQuery] = (0, import_react.useState)("");
  const [open, setOpen] = (0, import_react.useState)(false);
  const boxRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    __name(onClickOutside, "onClickOutside");
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);
  const selected = (0, import_react.useMemo)(() => options.find((o) => getId(o) === value) || null, [options, value, getId]);
  const filtered = (0, import_react.useMemo)(() => {
    const q = query.trim().toLowerCase();
    const list = q ? options.filter((o) => matches(o, q)) : options;
    return list.slice(0, 50);
  }, [options, query, matches]);
  function pick(o) {
    onChange(getId(o), o);
    setQuery("");
    setOpen(false);
  }
  __name(pick, "pick");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { ref: boxRef, className: "relative", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "input",
      {
        className: import_ui.input,
        style: import_ui.inputStyle,
        placeholder: placeholder || t("\u0627\u0628\u062D\u062B..."),
        value: open ? query : selected ? getLabel(selected) : "",
        onFocus: () => {
          setOpen(true);
          setQuery("");
        },
        onChange: (e) => setQuery(e.target.value)
      }
    ),
    open && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute z-20 mt-1 w-full max-h-80 overflow-y-auto rounded-lg border shadow-lg", style: { background: "var(--color-surface)", borderColor: "var(--color-border)" }, children: filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "px-3 py-3 text-sm", style: { color: "var(--color-ink-soft)" }, children: t("\u0644\u0627 \u062A\u0648\u062C\u062F \u0646\u062A\u0627\u0626\u062C") }) : filtered.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "button",
      {
        type: "button",
        onClick: () => pick(o),
        className: "w-full text-start px-3 py-2 border-t first:border-t-0 hover:bg-[var(--color-bg)] transition-colors",
        style: { borderColor: "var(--color-border)" },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-sm font-semibold", children: getLabel(o) }),
          getSubLabel && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-xs", style: { color: "var(--color-ink-soft)" }, children: getSubLabel(o) })
        ]
      },
      getId(o)
    )) })
  ] });
}
__name(SearchableSelect, "SearchableSelect");

});
