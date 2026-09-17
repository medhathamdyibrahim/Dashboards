// lib/format.js — compiled from src/lib/format.ts (readable, unminified)
__modules__.define("lib/format", function (module, exports, require) {
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
var format_exports = {};
__export(format_exports, {
  dateAr: () => dateAr,
  money: () => money,
  qty: () => qty
});
module.exports = __toCommonJS(format_exports);
function money(amount, currency = "EGP") {
  const n = Number.isFinite(amount) ? amount : 0;
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}
__name(money, "money");
function qty(n) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("en-US", { maximumFractionDigits: 3 });
}
__name(qty, "qty");
function dateAr(d) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}
__name(dateAr, "dateAr");

});
