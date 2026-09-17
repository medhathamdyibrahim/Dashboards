// components/Modal.js — compiled from src/components/Modal.tsx (readable, unminified)
__modules__.define("components/Modal", function (module, exports, require) {
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
var Modal_exports = {};
__export(Modal_exports, {
  default: () => Modal
});
module.exports = __toCommonJS(Modal_exports);
var import_jsx_runtime = require("react/jsx-runtime");
function Modal({
  title,
  onClose,
  children,
  wide
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "div",
    {
      className: "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4",
      style: { background: "rgba(22,33,29,0.45)" },
      onClick: onClose,
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "div",
        {
          onClick: (e) => e.stopPropagation(),
          className: `w-full ${wide ? "max-w-3xl" : "max-w-lg"} rounded-2xl shadow-xl`,
          style: { background: "var(--color-surface)" },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between px-6 py-4 border-b", style: { borderColor: "var(--color-border)" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "font-display font-bold text-lg", children: title }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: onClose, className: "text-xl leading-none opacity-60 hover:opacity-100", children: "\xD7" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "px-6 py-5", children })
          ]
        }
      )
    }
  );
}
__name(Modal, "Modal");

});
