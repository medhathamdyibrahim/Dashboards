// lib/encryptedFields.js — compiled from src/lib/encryptedFields.ts (readable, unminified)
__modules__.define("lib/encryptedFields", function (module, exports, require) {
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
var encryptedFields_exports = {};
__export(encryptedFields_exports, {
  ENCRYPTED_FIELDS: () => ENCRYPTED_FIELDS,
  isEncryptedTable: () => isEncryptedTable
});
module.exports = __toCommonJS(encryptedFields_exports);
const ENCRYPTED_FIELDS = {
  // Every module is a flat row by default (schema.sql — the current
  // pipeline) — no Quotations/Production tables, no Attachments table.
  // po_items/so_items are the one exception: line items for an itemized
  // Purchase Order (optional) or a Sales Order (always itemized).
  // customers has no encrypted fields left: every remaining column
  // (name, short_name, sap_code, region, local_export, owner_name) is
  // needed for search, RLS, or reporting, so nothing on it is sensitive
  // enough to encrypt.
  purchase_orders: ["notes", "po_quantity", "asp", "po_value"],
  po_items: ["quantity", "price", "value", "notes"],
  sales_orders: ["notes", "so_quantity", "so_value"],
  so_items: ["quantity", "price", "value", "notes"],
  dispatches: ["notes", "dispatch_quantity"],
  invoices: ["notes", "invoice_quantity", "invoice_value"],
  payments: ["notes", "reference_no", "amount"]
};
function isEncryptedTable(table) {
  return Object.prototype.hasOwnProperty.call(ENCRYPTED_FIELDS, table);
}
__name(isEncryptedTable, "isEncryptedTable");

});
