// components/CollapsibleSection.js — compiled from src/components/CollapsibleSection.tsx (readable, unminified)
__modules__.define("components/CollapsibleSection", function (module, exports, require) {
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
var CollapsibleSection_exports = {};
__export(CollapsibleSection_exports, {
  default: () => CollapsibleSection
});
module.exports = __toCommonJS(CollapsibleSection_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_react = require("react");
var import_ui = require("../lib/ui");
var import_LanguageContext = require("../context/LanguageContext");
function CollapsibleSection({
  title,
  description,
  defaultOpen = true,
  actions,
  children
}) {
  const [open, setOpen] = (0, import_react.useState)(defaultOpen);
  const { t } = (0, import_LanguageContext.useLanguage)();
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: import_ui.card, style: import_ui.cardStyle, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between gap-3 p-5 cursor-pointer select-none", onClick: () => setOpen((o) => !o), children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "font-display font-bold", children: title }),
        description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-xs mt-1", style: { color: "var(--color-ink-soft)" }, children: description })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-3 shrink-0", onClick: (e) => e.stopPropagation(), children: [
        actions,
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            onClick: () => setOpen((o) => !o),
            className: "w-7 h-7 rounded-lg flex items-center justify-center text-sm",
            style: { background: "var(--color-surface-2)", color: "var(--color-ink-soft)" },
            "aria-label": t(open ? "\u0637\u064A" : "\u062A\u0648\u0633\u064A\u0639"),
            children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { display: "inline-block", transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }, children: "\u2039" })
          }
        )
      ] })
    ] }),
    open && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "px-5 pb-5 pt-1 border-t", style: { borderColor: "var(--color-border)" }, children })
  ] });
}
__name(CollapsibleSection, "CollapsibleSection");

});
