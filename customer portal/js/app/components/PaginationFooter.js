// components/PaginationFooter.js — compiled from src/components/PaginationFooter.tsx (readable, unminified)
__modules__.define("components/PaginationFooter", function (module, exports, require) {
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
var PaginationFooter_exports = {};
__export(PaginationFooter_exports, {
  default: () => PaginationFooter
});
module.exports = __toCommonJS(PaginationFooter_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_LanguageContext = require("../context/LanguageContext");
var import_ui = require("../lib/ui");
function PaginationFooter({
  page,
  totalPages,
  totalCount,
  onPageChange
}) {
  const { t } = (0, import_LanguageContext.useLanguage)();
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between px-3 py-3 text-sm", style: { color: "var(--color-ink-soft)" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      t("\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0646\u062A\u0627\u0626\u062C:"),
      " ",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-semibold tabular", children: totalCount })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          disabled: page === 0,
          onClick: () => onPageChange(page - 1),
          className: import_ui.btnSecondary,
          style: { ...import_ui.btnSecondaryStyle, padding: "4px 10px", fontSize: "0.75rem" },
          children: t("\u0627\u0644\u0633\u0627\u0628\u0642")
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "tabular text-xs", children: [
        page + 1,
        " / ",
        totalPages
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          disabled: page >= totalPages - 1,
          onClick: () => onPageChange(page + 1),
          className: import_ui.btnSecondary,
          style: { ...import_ui.btnSecondaryStyle, padding: "4px 10px", fontSize: "0.75rem" },
          children: t("\u0627\u0644\u062A\u0627\u0644\u064A")
        }
      )
    ] })
  ] });
}
__name(PaginationFooter, "PaginationFooter");

});
