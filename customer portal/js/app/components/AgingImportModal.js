// components/AgingImportModal.js — compiled from src/components/AgingImportModal.tsx (readable, unminified)
__modules__.define("components/AgingImportModal", function (module, exports, require) {
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
var AgingImportModal_exports = {};
__export(AgingImportModal_exports, {
  default: () => AgingImportModal
});
module.exports = __toCommonJS(AgingImportModal_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_react = require("react");
var import_LanguageContext = require("../context/LanguageContext");
var import_AuthContext = require("../context/AuthContext");
var import_format = require("../lib/format");
var import_fx = require("../lib/fx");
var import_ui = require("../lib/ui");
var import_Modal = __toESM(require("./Modal"));
var import_aging = require("../lib/aging");
function AgingImportModal({ onClose, onApplied }) {
  const { t } = (0, import_LanguageContext.useLanguage)();
  const { userId } = (0, import_AuthContext.useAuth)();
  const [step, setStep] = (0, import_react.useState)("upload");
  const [agingDate, setAgingDate] = (0, import_react.useState)("");
  const [file, setFile] = (0, import_react.useState)(null);
  const [reportRows, setReportRows] = (0, import_react.useState)([]);
  const [candidates, setCandidates] = (0, import_react.useState)([]);
  const [selected, setSelected] = (0, import_react.useState)(/* @__PURE__ */ new Set());
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  const [result, setResult] = (0, import_react.useState)(null);
  async function handleAnalyze() {
    if (!agingDate) {
      setError(t("\u0645\u0646 \u0641\u0636\u0644\u0643 \u0623\u062F\u062E\u0644 \u062A\u0627\u0631\u064A\u062E \u062A\u0642\u0631\u064A\u0631 \u0623\u0639\u0645\u0627\u0631 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 (As of Date)."));
      return;
    }
    if (!file) {
      setError(t("\u0645\u0646 \u0641\u0636\u0644\u0643 \u0627\u0631\u0641\u0639 \u0645\u0644\u0641 \u062A\u0642\u0631\u064A\u0631 \u0623\u0639\u0645\u0627\u0631 \u0627\u0644\u0639\u0645\u0644\u0627\u0621."));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const rows = await (0, import_aging.parseAgingReport)(file);
      setReportRows(rows);
      const found = await (0, import_aging.findInferredCollections)(agingDate, rows);
      setCandidates(found);
      setSelected(new Set(found.map((f) => f.invoiceId)));
      setStep("preview");
    } catch (e) {
      setError(e instanceof import_aging.AgingImportError ? e.message : t("\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0645\u0644\u0641: ") + e.message);
    } finally {
      setBusy(false);
    }
  }
  __name(handleAnalyze, "handleAnalyze");
  function toggle(id) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }
  __name(toggle, "toggle");
  async function handleApply() {
    setBusy(true);
    setError(null);
    try {
      const chosen = candidates.filter((c) => selected.has(c.invoiceId));
      const res = await (0, import_aging.applyInferredCollections)(agingDate, chosen, userId);
      setResult(res);
      setStep("done");
      onApplied();
    } catch (e) {
      setError(t("\u062D\u062F\u062B \u062E\u0637\u0623: ") + e.message);
    } finally {
      setBusy(false);
    }
  }
  __name(handleApply, "handleApply");
  const [totalSelectedUsd, setTotalSelectedUsd] = (0, import_react.useState)(0);
  (0, import_react.useEffect)(() => {
    let cancelled = false;
    async function computeUsd() {
      const rows = await (0, import_fx.loadFxRates)();
      const chosen = candidates.filter((c) => selected.has(c.invoiceId));
      const total = chosen.reduce((s, c) => s + (0, import_fx.convertToUsd)(c.balanceDue, c.currency, c.invoiceDate, rows).usd, 0);
      if (!cancelled) setTotalSelectedUsd(total);
    }
    __name(computeUsd, "computeUsd");
    computeUsd();
    return () => {
      cancelled = true;
    };
  }, [candidates, selected]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_Modal.default, { title: t("\u0627\u0633\u062A\u064A\u0631\u0627\u062F \u062A\u0642\u0631\u064A\u0631 \u0623\u0639\u0645\u0627\u0631 \u0627\u0644\u0639\u0645\u0644\u0627\u0621"), onClose, wide: true, children: [
    step === "upload" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-sm rounded-lg px-3 py-2.5", style: { background: "var(--color-surface-2)", color: "var(--color-ink-soft)" }, children: t("\u0623\u064A \u0641\u0627\u062A\u0648\u0631\u0629 \u0628\u062A\u0627\u0631\u064A\u062E \u0642\u0628\u0644 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u062A\u0642\u0631\u064A\u0631 \u062F\u0647 \u0648\u0645\u0634 \u0645\u0648\u062C\u0648\u062F\u0629 \u0641\u064A \u0627\u0644\u0645\u0644\u0641\u060C \u0647\u064A\u062A\u0645 \u0627\u0639\u062A\u0628\u0627\u0631\u0647\u0627 \u0645\u062A\u062D\u0635\u0651\u0644\u0629 \u0628\u0627\u0644\u0643\u0627\u0645\u0644 \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627.") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u062A\u0627\u0631\u064A\u062E \u062A\u0642\u0631\u064A\u0631 \u0623\u0639\u0645\u0627\u0631 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 (As of Date) *") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "date", required: true, className: import_ui.input, style: import_ui.inputStyle, value: agingDate, onChange: (e) => setAgingDate(e.target.value) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: import_ui.label, style: import_ui.labelStyle, children: t("\u0645\u0644\u0641 \u0627\u0644\u062A\u0642\u0631\u064A\u0631 (Excel) *") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            type: "file",
            accept: ".xlsx,.xls",
            required: true,
            className: import_ui.input,
            style: import_ui.inputStyle,
            onChange: (e) => setFile(e.target.files?.[0] || null)
          }
        )
      ] }),
      error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-sm", style: { color: "var(--color-danger)" }, children: error }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex gap-2 pt-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: handleAnalyze, disabled: busy, className: import_ui.btnPrimary, style: import_ui.btnPrimaryStyle, children: busy ? t("...\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0644\u064A\u0644") : t("\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0645\u0644\u0641") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: onClose, className: import_ui.btnSecondary, style: import_ui.btnSecondaryStyle, children: t("\u0625\u0644\u063A\u0627\u0621") })
      ] })
    ] }),
    step === "preview" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "text-sm rounded-lg px-3 py-2.5", style: { background: "var(--color-surface-2)", color: "var(--color-ink-soft)" }, children: [
        t("\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649"),
        " ",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: reportRows.length }),
        " ",
        t("\u0635\u0641 \u0641\u064A \u0627\u0644\u0645\u0644\u0641\u060C \u0648"),
        " ",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: candidates.length }),
        " ",
        t("\u0641\u0627\u062A\u0648\u0631\u0629 \u064A\u064F\u0641\u062A\u0631\u0636 \u0623\u0646\u0647\u0627 \u062A\u062D\u0635\u0651\u0644\u062A \u0628\u0627\u0644\u0643\u0627\u0645\u0644. \u0631\u0627\u062C\u0639 \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0648\u0623\u0632\u0644 \u0623\u064A \u0641\u0627\u062A\u0648\u0631\u0629 \u0644\u0627 \u062A\u0631\u064A\u062F \u062A\u0623\u0643\u064A\u062F\u0647\u0627 \u0642\u0628\u0644 \u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F.")
      ] }),
      candidates.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-sm py-4 text-center", style: { color: "var(--color-ink-soft)" }, children: t("\u0644\u0627 \u062A\u0648\u062C\u062F \u0641\u0648\u0627\u062A\u064A\u0631 \u064A\u0645\u0643\u0646 \u0627\u0639\u062A\u0628\u0627\u0631\u0647\u0627 \u0645\u062A\u062D\u0635\u0651\u0644\u0629 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u0645\u0644\u0641.") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "max-h-96 overflow-y-auto rounded-lg border", style: { borderColor: "var(--color-border)" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "w-full", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { style: { background: "var(--color-surface-2)" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u0639\u0645\u064A\u0644") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: import_ui.th, style: import_ui.thStyle, children: t("\u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u064F\u0633\u062A\u0646\u062A\u062C \u062A\u062D\u0635\u064A\u0644\u0647") })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: candidates.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: "border-t", style: { borderColor: "var(--color-border)" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: import_ui.td, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: selected.has(c.invoiceId), onChange: () => toggle(c.invoiceId) }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} font-medium`, children: c.invoiceNumber }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: import_ui.td, children: c.customerName }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} tabular`, children: (0, import_format.dateAr)(c.invoiceDate) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: `${import_ui.td} tabular font-medium`, style: { color: "var(--color-primary)" }, children: (0, import_format.money)(c.balanceDue, c.currency) })
        ] }, c.invoiceId)) })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between text-sm font-semibold pt-1", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          t("\u0639\u062F\u062F \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0645\u062E\u062A\u0627\u0631\u0629"),
          ": ",
          selected.size
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { color: "var(--color-primary)" }, children: [
          t("\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A"),
          ": ",
          (0, import_format.money)(totalSelectedUsd, "USD")
        ] })
      ] }),
      error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-sm", style: { color: "var(--color-danger)" }, children: error }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex gap-2 pt-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: handleApply, disabled: busy || selected.size === 0, className: import_ui.btnPrimary, style: import_ui.btnPrimaryStyle, children: busy ? t("...\u062C\u0627\u0631\u064A \u0627\u0644\u062D\u0641\u0638") : `\u2713 ${t("\u0627\u0639\u062A\u0645\u0627\u062F \u0648\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062A\u062D\u0635\u064A\u0644\u0627\u062A")} (${selected.size})` }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => setStep("upload"), className: import_ui.btnSecondary, style: import_ui.btnSecondaryStyle, children: t("\u0631\u062C\u0648\u0639") })
      ] })
    ] }),
    step === "done" && result && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "text-sm rounded-lg px-3 py-3", style: { background: "var(--color-primary-soft)", color: "var(--color-primary-dark)" }, children: [
        "\u2713 ",
        t("\u062A\u0645 \u062A\u0633\u062C\u064A\u0644"),
        " ",
        result.succeeded,
        " ",
        t("\u062A\u062D\u0635\u064A\u0644 \u0628\u0646\u062C\u0627\u062D.")
      ] }),
      result.failed.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "text-sm rounded-lg px-3 py-3", style: { background: "var(--color-danger-soft)", color: "var(--color-danger)" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "font-semibold mb-1", children: [
          t("\u0641\u0634\u0644 \u062A\u0633\u062C\u064A\u0644"),
          " ",
          result.failed.length,
          " ",
          t("\u0641\u0627\u062A\u0648\u0631\u0629:")
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: "list-disc ps-5 space-y-0.5", children: result.failed.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
          f.invoiceNumber,
          ": ",
          f.error
        ] }, f.invoiceNumber)) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: onClose, className: import_ui.btnPrimary, style: import_ui.btnPrimaryStyle, children: t("\u062A\u0645") })
    ] })
  ] });
}
__name(AgingImportModal, "AgingImportModal");

});
