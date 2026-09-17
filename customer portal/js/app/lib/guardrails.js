// lib/guardrails.js — compiled from src/lib/guardrails.ts (readable, unminified)
__modules__.define("lib/guardrails", function (module, exports, require) {
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
var guardrails_exports = {};
__export(guardrails_exports, {
  GuardrailError: () => GuardrailError,
  checkDispatchQty: () => checkDispatchQty,
  checkInvoiceQty: () => checkInvoiceQty,
  checkPaymentAmount: () => checkPaymentAmount,
  checkSoQty: () => checkSoQty
});
module.exports = __toCommonJS(guardrails_exports);
var import_secureClient = require("./secureClient");
const _GuardrailError = class _GuardrailError extends Error {
};
__name(_GuardrailError, "GuardrailError");
let GuardrailError = _GuardrailError;
async function sumDecrypted(table, column, filterColumn, filterValue, excludeId) {
  let query = (0, import_secureClient.secureFrom)(table).select(`id, ${column}`).eq(filterColumn, filterValue);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query;
  if (error) throw new GuardrailError(error.message);
  return (data || []).reduce((sum, row) => sum + (Number(row[column]) || 0), 0);
}
__name(sumDecrypted, "sumDecrypted");
async function checkSoQty(poId, proposedQty, excludeId) {
  const { data: po, error } = await (0, import_secureClient.secureFrom)("purchase_orders").select("po_quantity").eq("id", poId).single();
  if (error || !po) throw new GuardrailError("\u062A\u0639\u0630\u0631 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0623\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621 (PO).");
  const ordered = Number(po.po_quantity) || 0;
  const alreadyAllocated = await sumDecrypted("sales_orders", "so_quantity", "po_id", poId, excludeId);
  const remaining = ordered - alreadyAllocated;
  if (proposedQty > remaining) {
    throw new GuardrailError(`\u0627\u0644\u0643\u0645\u064A\u0629 (${proposedQty}) \u0623\u0643\u0628\u0631 \u0645\u0646 \u0627\u0644\u0645\u062A\u0627\u062D \u0641\u064A \u0623\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621. \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0628\u0647: ${remaining}`);
  }
  return remaining;
}
__name(checkSoQty, "checkSoQty");
async function checkDispatchQty(soId, proposedQty, excludeId) {
  const { data: so, error } = await (0, import_secureClient.secureFrom)("sales_orders").select("so_quantity").eq("id", soId).single();
  if (error || !so) throw new GuardrailError("\u062A\u0639\u0630\u0631 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0623\u0645\u0631 \u0627\u0644\u0628\u064A\u0639 (SO).");
  const allocated = Number(so.so_quantity) || 0;
  const alreadyDispatched = await sumDecrypted("dispatches", "dispatch_quantity", "so_id", soId, excludeId);
  const remaining = allocated - alreadyDispatched;
  if (proposedQty > remaining) {
    throw new GuardrailError(`\u0627\u0644\u0643\u0645\u064A\u0629 (${proposedQty}) \u0623\u0643\u0628\u0631 \u0645\u0646 \u0627\u0644\u0645\u062A\u0627\u062D \u0644\u0644\u0634\u062D\u0646 \u0641\u064A \u0623\u0645\u0631 \u0627\u0644\u0628\u064A\u0639. \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0628\u0647: ${remaining}`);
  }
  return remaining;
}
__name(checkDispatchQty, "checkDispatchQty");
async function checkInvoiceQty(soId, proposedQty, excludeId) {
  const dispatched = await sumDecrypted("dispatches", "dispatch_quantity", "so_id", soId);
  const alreadyInvoiced = await sumDecrypted("invoices", "invoice_quantity", "so_id", soId, excludeId);
  const remaining = dispatched - alreadyInvoiced;
  if (proposedQty > remaining) {
    throw new GuardrailError(`\u0627\u0644\u0643\u0645\u064A\u0629 (${proposedQty}) \u0623\u0643\u0628\u0631 \u0645\u0646 \u0627\u0644\u0645\u062A\u0627\u062D \u0644\u0644\u0641\u0648\u062A\u0631\u0629 (\u0627\u0644\u0645\u0634\u062D\u0648\u0646 \u0641\u0639\u0644\u064A\u064B\u0627). \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0628\u0647: ${remaining}`);
  }
  return remaining;
}
__name(checkInvoiceQty, "checkInvoiceQty");
async function checkPaymentAmount(invoiceId, proposedAmount, excludeId) {
  const { data: inv, error } = await (0, import_secureClient.secureFrom)("invoices").select("invoice_value").eq("id", invoiceId).single();
  if (error || !inv) throw new GuardrailError("\u062A\u0639\u0630\u0631 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629.");
  const total = Number(inv.invoice_value) || 0;
  const alreadyPaid = await sumDecrypted("payments", "amount", "invoice_id", invoiceId, excludeId);
  const remaining = total - alreadyPaid;
  if (proposedAmount > remaining) {
    throw new GuardrailError(`\u0627\u0644\u0645\u0628\u0644\u063A (${proposedAmount}) \u0623\u0643\u0628\u0631 \u0645\u0646 \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0639\u0644\u0649 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629: ${remaining}`);
  }
  return remaining;
}
__name(checkPaymentAmount, "checkPaymentAmount");

});
