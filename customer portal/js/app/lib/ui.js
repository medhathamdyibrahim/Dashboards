// lib/ui.js — compiled from src/lib/ui.ts (readable, unminified)
__modules__.define("lib/ui", function (module, exports, require) {
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var ui_exports = {};
__export(ui_exports, {
  BRAND_BLUE: () => BRAND_BLUE,
  BRAND_GRAY: () => BRAND_GRAY,
  BRAND_ORANGE: () => BRAND_ORANGE,
  btnDanger: () => btnDanger,
  btnDangerStyle: () => btnDangerStyle,
  btnPrimary: () => btnPrimary,
  btnPrimaryStyle: () => btnPrimaryStyle,
  btnSecondary: () => btnSecondary,
  btnSecondaryStyle: () => btnSecondaryStyle,
  card: () => card,
  cardStyle: () => cardStyle,
  input: () => input,
  inputStyle: () => inputStyle,
  label: () => label,
  labelStyle: () => labelStyle,
  td: () => td,
  th: () => th,
  thStyle: () => thStyle,
  theadRowStyle: () => theadRowStyle
});
module.exports = __toCommonJS(ui_exports);
const BRAND_BLUE = "#004ed8";
const BRAND_GRAY = "#dcddde";
const BRAND_ORANGE = "#f7962f";
const input = "w-full rounded-lg border px-3 py-2 text-sm bg-white text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 transition-shadow";
const inputStyle = { borderColor: "var(--color-border)" };
const label = "block text-xs font-medium mb-1";
const labelStyle = { color: "var(--color-ink-soft)" };
const btnPrimary = "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40";
const btnPrimaryStyle = { background: "var(--color-primary)" };
const btnSecondary = "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold border transition-colors hover:bg-[var(--color-bg)] disabled:opacity-40";
const btnSecondaryStyle = { borderColor: "var(--color-border)", color: "var(--color-ink)" };
const btnDanger = "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80";
const btnDangerStyle = { color: "var(--color-danger)" };
const card = "rounded-2xl border shadow-sm";
const cardStyle = { background: "var(--color-surface)", borderColor: "var(--color-border)" };
const th = "text-start text-xs font-bold px-3 py-2.5 whitespace-nowrap border";
const thStyle = { background: BRAND_BLUE, color: "#FFFFFF", borderColor: BRAND_BLUE };
const td = "px-3 py-2.5 text-sm whitespace-nowrap";
const theadRowStyle = { background: BRAND_BLUE };

});
