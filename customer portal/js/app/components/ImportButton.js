// components/ImportButton.js — compiled from src/components/ImportButton.tsx (readable, unminified)
__modules__.define("components/ImportButton", function (module, exports, require) {
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
var ImportButton_exports = {};
__export(ImportButton_exports, {
  default: () => ImportButton
});
module.exports = __toCommonJS(ImportButton_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_react = require("react");
var import_LanguageContext = require("../context/LanguageContext");
var import_Modal = __toESM(require("./Modal"));
var import_ui = require("../lib/ui");
function ImportButton({
  label,
  sheetName,
  columns,
  onImport,
  onDone
}) {
  const { t } = (0, import_LanguageContext.useLanguage)();
  const [open, setOpen] = (0, import_react.useState)(false);
  const [importing, setImporting] = (0, import_react.useState)(false);
  const [result, setResult] = (0, import_react.useState)(null);
  const fileInputRef = (0, import_react.useRef)(null);
  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const r = await onImport(file);
      setResult(r);
      onDone();
    } catch (err) {
      setResult({ total: 0, created: 0, updated: 0, skipped: 0, errors: [err.message] });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }
  __name(handleFile, "handleFile");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => {
      setOpen(true);
      setResult(null);
    }, className: import_ui.btnSecondary, style: import_ui.btnSecondaryStyle, children: [
      "\u2B71 ",
      label
    ] }),
    open && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_Modal.default, { title: label, onClose: () => setOpen(false), children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-4 text-sm", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { style: { color: "var(--color-ink-soft)" }, children: [
        t("\u0627\u0631\u0641\u0639 \u0646\u0641\u0633 \u0645\u0644\u0641 \u0627\u0644\u0642\u0627\u0644\u0628 (Excel) \u2014 \u0647\u064A\u062A\u0645 \u0627\u0644\u0642\u0631\u0627\u0621\u0629 \u0645\u0646 \u0634\u064A\u062A \u0628\u0627\u0633\u0645"),
        " ",
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "font-mono font-semibold", children: [
          '"',
          sheetName,
          '"'
        ] }),
        t("\u060C \u0648\u0639\u0646\u0627\u0648\u064A\u0646 \u0627\u0644\u0623\u0639\u0645\u062F\u0629 \u0644\u0627\u0632\u0645 \u062A\u0643\u0648\u0646 \u0628\u0627\u0644\u0638\u0628\u0637 \u0632\u064A \u062F\u064A:")
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `${import_ui.card} p-3 overflow-x-auto`, style: import_ui.cardStyle, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("table", { className: "w-full text-xs", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { style: { color: "var(--color-primary)" }, children: columns.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "text-start p-1 font-bold whitespace-nowrap", children: c }, c)) }) }) }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { color: "var(--color-ink-soft)" }, children: t("\u0644\u0648 \u0627\u0644\u0631\u0642\u0645 \u0645\u0648\u062C\u0648\u062F \u0628\u0627\u0644\u0641\u0639\u0644 \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645 \u0647\u064A\u062A\u062D\u062F\u0651\u062B\u060C \u0648\u0644\u0648 \u062C\u062F\u064A\u062F \u0647\u064A\u062A\u0636\u0627\u0641 \u2014 \u0645\u0641\u064A\u0634 \u062D\u0627\u062C\u0629 \u0628\u062A\u062A\u0645\u0633\u062D.") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { ref: fileInputRef, type: "file", accept: ".xlsx,.xls", onChange: handleFile, disabled: importing, className: "text-sm" }),
      importing && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: "var(--color-ink-soft)" }, children: t("...\u062C\u0627\u0631\u064A \u0627\u0644\u0627\u0633\u062A\u064A\u0631\u0627\u062F") }),
      result && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `${import_ui.card} p-3 space-y-1`, style: import_ui.cardStyle, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          t("\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A"),
          ": ",
          result.total,
          " \u2014 ",
          t("\u0645\u064F\u0636\u0627\u0641"),
          ": ",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "var(--color-primary)" }, children: result.created }),
          " \u2014 ",
          t("\u0645\u064F\u062D\u062F\u0651\u062B"),
          ": ",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "var(--color-accent)" }, children: result.updated }),
          " \u2014 ",
          t("\u0645\u062A\u062C\u0627\u0647\u0644"),
          ": ",
          result.skipped
        ] }),
        result.errors.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "mt-2", style: { color: "var(--color-danger)" }, children: [
          result.errors.slice(0, 20).map((e, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            "\u2022 ",
            e
          ] }, i)),
          result.errors.length > 20 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            "... ",
            t("\u0648"),
            " ",
            result.errors.length - 20,
            " ",
            t("\u062A\u062D\u0630\u064A\u0631 \u0625\u0636\u0627\u0641\u064A")
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex gap-2 pt-1", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => setOpen(false), className: import_ui.btnPrimary, style: import_ui.btnPrimaryStyle, children: t("\u062A\u0645\u0627\u0645") }) })
    ] }) })
  ] });
}
__name(ImportButton, "ImportButton");

});
