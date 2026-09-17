// components/StatusPill.js — compiled from src/components/StatusPill.tsx (readable, unminified)
__modules__.define("components/StatusPill", function (module, exports, require) {
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
var StatusPill_exports = {};
__export(StatusPill_exports, {
  default: () => StatusPill
});
module.exports = __toCommonJS(StatusPill_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_LanguageContext = require("../context/LanguageContext");
const STATUS_MAP = {
  open: { label: "\u0645\u0641\u062A\u0648\u062D", bg: "var(--color-info-soft)", fg: "var(--color-info)" },
  quoted: { label: "\u062A\u0645 \u0627\u0644\u062A\u0633\u0639\u064A\u0631", bg: "var(--color-accent-soft)", fg: "var(--color-accent)" },
  closed: { label: "\u0645\u063A\u0644\u0642", bg: "#EEECE4", fg: "var(--color-ink-soft)" },
  cancelled: { label: "\u0645\u0644\u063A\u064A", bg: "var(--color-danger-soft)", fg: "var(--color-danger)" },
  draft: { label: "\u0645\u0633\u0648\u062F\u0629", bg: "#EEECE4", fg: "var(--color-ink-soft)" },
  pending_approval: { label: "\u0628\u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629", bg: "var(--color-accent-soft)", fg: "var(--color-accent)" },
  confirmed: { label: "\u0645\u0624\u0643\u062F", bg: "var(--color-primary-soft)", fg: "var(--color-primary)" },
  rejected: { label: "\u0645\u0631\u0641\u0648\u0636", bg: "var(--color-danger-soft)", fg: "var(--color-danger)" },
  in_progress: { label: "\u0642\u064A\u062F \u0627\u0644\u062A\u0646\u0641\u064A\u0630", bg: "var(--color-info-soft)", fg: "var(--color-info)" },
  completed: { label: "\u0645\u0643\u062A\u0645\u0644", bg: "var(--color-primary-soft)", fg: "var(--color-primary)" },
  shipped: { label: "\u062A\u0645 \u0627\u0644\u0634\u062D\u0646", bg: "var(--color-info-soft)", fg: "var(--color-info)" },
  delivered: { label: "\u062A\u0645 \u0627\u0644\u062A\u0633\u0644\u064A\u0645", bg: "var(--color-primary-soft)", fg: "var(--color-primary)" },
  issued: { label: "\u0635\u0627\u062F\u0631\u0629", bg: "var(--color-info-soft)", fg: "var(--color-info)" },
  partially_paid: { label: "\u0645\u062F\u0641\u0648\u0639\u0629 \u062C\u0632\u0626\u064A\u064B\u0627", bg: "var(--color-accent-soft)", fg: "var(--color-accent)" },
  paid: { label: "\u0645\u062F\u0641\u0648\u0639\u0629 \u0628\u0627\u0644\u0643\u0627\u0645\u0644", bg: "var(--color-primary-soft)", fg: "var(--color-primary)" },
  overdue: { label: "\u0645\u062A\u0623\u062E\u0631\u0629", bg: "var(--color-danger-soft)", fg: "var(--color-danger)" }
};
function StatusPill({ status }) {
  const { t } = (0, import_LanguageContext.useLanguage)();
  const s = STATUS_MAP[status] || { label: status, bg: "#EEECE4", fg: "var(--color-ink-soft)" };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "span",
    {
      className: "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
      style: { background: s.bg, color: s.fg },
      children: t(s.label)
    }
  );
}
__name(StatusPill, "StatusPill");

});
