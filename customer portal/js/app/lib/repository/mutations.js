// lib/repository/mutations.js — compiled from src/lib/repository/mutations.ts (readable, unminified)
__modules__.define("lib/repository/mutations", function (module, exports, require) {
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
var mutations_exports = {};
__export(mutations_exports, {
  createCustomer: () => createCustomer,
  createDispatch: () => createDispatch,
  createInvoice: () => createInvoice,
  createPayment: () => createPayment,
  createPo: () => createPo,
  createSo: () => createSo,
  deleteCustomer: () => deleteCustomer,
  deleteDispatch: () => deleteDispatch,
  deleteInvoice: () => deleteInvoice,
  deletePayment: () => deletePayment,
  deletePo: () => deletePo,
  deleteSo: () => deleteSo,
  listPoItems: () => listPoItems,
  listSoItems: () => listSoItems,
  updateCustomer: () => updateCustomer,
  updateDispatch: () => updateDispatch,
  updateInvoice: () => updateInvoice,
  updatePayment: () => updatePayment,
  updatePo: () => updatePo,
  updateSo: () => updateSo
});
module.exports = __toCommonJS(mutations_exports);
var import_secureClient = require("../secureClient");
var import_guardrails = require("../guardrails");
function asResult(data, error) {
  if (error instanceof import_guardrails.GuardrailError) return { data: null, error: { message: error.message } };
  return { data, error };
}
__name(asResult, "asResult");
function summarizePoItems(items) {
  const po_quantity = items.reduce((s, i) => s + i.quantity, 0);
  const po_value = items.reduce((s, i) => s + i.quantity * i.price, 0);
  const asp = po_quantity > 0 ? po_value / po_quantity : 0;
  const item_name = items.length === 1 ? items[0].item_name : `${items.length} items`;
  return { po_quantity, po_value, asp, item_name };
}
__name(summarizePoItems, "summarizePoItems");
async function createPo(input, items) {
  const header = input.is_itemized && items?.length ? { ...input, ...summarizePoItems(items) } : input;
  const { data, error } = await (0, import_secureClient.secureFrom)("purchase_orders").insert({ currency: "USD", status: "open", ...header }).select().single();
  if (error || !data) return { data, error };
  if (input.is_itemized && items?.length) {
    const rows = items.map((it, idx) => ({ po_id: data.id, item_name: it.item_name, quantity: it.quantity, price: it.price, value: it.quantity * it.price, notes: it.notes ?? null, line_order: idx }));
    const { error: itemsError } = await (0, import_secureClient.secureFrom)("po_items").insert(rows);
    if (itemsError) return { data, error: itemsError };
  }
  return { data, error: null };
}
__name(createPo, "createPo");
async function updatePo(id, input, items) {
  const header = input.is_itemized && items?.length ? { ...input, ...summarizePoItems(items) } : input;
  const { data, error } = await (0, import_secureClient.secureFrom)("purchase_orders").update(header).eq("id", id).select().single();
  if (error) return { data, error };
  if (input.is_itemized && items) {
    await (0, import_secureClient.secureFrom)("po_items").delete().eq("po_id", id);
    if (items.length) {
      const rows = items.map((it, idx) => ({ po_id: id, item_name: it.item_name, quantity: it.quantity, price: it.price, value: it.quantity * it.price, notes: it.notes ?? null, line_order: idx }));
      const { error: itemsError } = await (0, import_secureClient.secureFrom)("po_items").insert(rows);
      if (itemsError) return { data, error: itemsError };
    }
  }
  return { data, error: null };
}
__name(updatePo, "updatePo");
async function deletePo(id) {
  return (0, import_secureClient.secureFrom)("purchase_orders").delete().eq("id", id);
}
__name(deletePo, "deletePo");
async function listPoItems(poId) {
  const { data } = await (0, import_secureClient.secureFrom)("po_items").select("*").eq("po_id", poId).order("line_order");
  return (data || []).map((r) => ({ id: r.id, po_id: r.po_id, item_name: r.item_name, quantity: Number(r.quantity) || 0, price: Number(r.price) || 0, notes: r.notes }));
}
__name(listPoItems, "listPoItems");
function summarizeSoItems(items) {
  const so_quantity = items.reduce((s, i) => s + i.quantity, 0);
  const so_value = items.reduce((s, i) => s + i.quantity * i.price, 0);
  const product_description = items.length === 1 ? items[0].product_description : `${items.length} items`;
  return { so_quantity, so_value, product_description };
}
__name(summarizeSoItems, "summarizeSoItems");
async function createSo(input, items) {
  try {
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    await (0, import_guardrails.checkSoQty)(input.po_id, totalQty);
    const header = { currency: "USD", status: "open", ...input, ...summarizeSoItems(items) };
    const { data, error } = await (0, import_secureClient.secureFrom)("sales_orders").insert(header).select().single();
    if (error || !data) return { data, error };
    const rows = items.map((it, idx) => ({
      so_id: data.id,
      product_description: it.product_description,
      proof_number: it.proof_number ?? null,
      version: it.version ?? null,
      so_type: it.so_type ?? null,
      quantity: it.quantity,
      price: it.price,
      value: it.quantity * it.price,
      notes: it.notes ?? null,
      line_order: idx
    }));
    const { error: itemsError } = await (0, import_secureClient.secureFrom)("so_items").insert(rows);
    if (itemsError) return { data, error: itemsError };
    return { data, error: null };
  } catch (e) {
    return asResult(null, e);
  }
}
__name(createSo, "createSo");
async function updateSo(id, poId, input, items) {
  try {
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    await (0, import_guardrails.checkSoQty)(poId, totalQty, id);
    const header = { ...input, ...summarizeSoItems(items) };
    const { data, error } = await (0, import_secureClient.secureFrom)("sales_orders").update(header).eq("id", id).select().single();
    if (error) return { data, error };
    await (0, import_secureClient.secureFrom)("so_items").delete().eq("so_id", id);
    const rows = items.map((it, idx) => ({
      so_id: id,
      product_description: it.product_description,
      proof_number: it.proof_number ?? null,
      version: it.version ?? null,
      so_type: it.so_type ?? null,
      quantity: it.quantity,
      price: it.price,
      value: it.quantity * it.price,
      notes: it.notes ?? null,
      line_order: idx
    }));
    const { error: itemsError } = await (0, import_secureClient.secureFrom)("so_items").insert(rows);
    if (itemsError) return { data, error: itemsError };
    return { data, error: null };
  } catch (e) {
    return asResult(null, e);
  }
}
__name(updateSo, "updateSo");
async function deleteSo(id) {
  return (0, import_secureClient.secureFrom)("sales_orders").delete().eq("id", id);
}
__name(deleteSo, "deleteSo");
async function listSoItems(soId) {
  const { data } = await (0, import_secureClient.secureFrom)("so_items").select("*").eq("so_id", soId).order("line_order");
  return (data || []).map((r) => ({
    id: r.id,
    so_id: r.so_id,
    product_description: r.product_description,
    proof_number: r.proof_number,
    version: r.version,
    so_type: r.so_type,
    quantity: Number(r.quantity) || 0,
    price: Number(r.price) || 0,
    notes: r.notes
  }));
}
__name(listSoItems, "listSoItems");
async function createDispatch(input) {
  try {
    await (0, import_guardrails.checkDispatchQty)(input.so_id, input.dispatch_quantity);
    return await (0, import_secureClient.secureFrom)("dispatches").insert({ status: "draft", ...input }).select().single();
  } catch (e) {
    return asResult(null, e);
  }
}
__name(createDispatch, "createDispatch");
async function updateDispatch(id, soId, input) {
  try {
    if (input.dispatch_quantity !== void 0) await (0, import_guardrails.checkDispatchQty)(soId, input.dispatch_quantity, id);
    return await (0, import_secureClient.secureFrom)("dispatches").update(input).eq("id", id).select().single();
  } catch (e) {
    return asResult(null, e);
  }
}
__name(updateDispatch, "updateDispatch");
async function deleteDispatch(id) {
  return (0, import_secureClient.secureFrom)("dispatches").delete().eq("id", id);
}
__name(deleteDispatch, "deleteDispatch");
async function createInvoice(input) {
  try {
    await (0, import_guardrails.checkInvoiceQty)(input.so_id, input.invoice_quantity);
    return await (0, import_secureClient.secureFrom)("invoices").insert({ currency: "USD", status: "draft", ...input }).select().single();
  } catch (e) {
    return asResult(null, e);
  }
}
__name(createInvoice, "createInvoice");
async function updateInvoice(id, soId, input) {
  try {
    if (input.invoice_quantity !== void 0) await (0, import_guardrails.checkInvoiceQty)(soId, input.invoice_quantity, id);
    return await (0, import_secureClient.secureFrom)("invoices").update(input).eq("id", id).select().single();
  } catch (e) {
    return asResult(null, e);
  }
}
__name(updateInvoice, "updateInvoice");
async function deleteInvoice(id) {
  return (0, import_secureClient.secureFrom)("invoices").delete().eq("id", id);
}
__name(deleteInvoice, "deleteInvoice");
async function createPayment(input) {
  try {
    await (0, import_guardrails.checkPaymentAmount)(input.invoice_id, input.amount);
    return await (0, import_secureClient.secureFrom)("payments").insert({ currency: "USD", ...input }).select().single();
  } catch (e) {
    return asResult(null, e);
  }
}
__name(createPayment, "createPayment");
async function updatePayment(id, invoiceId, input) {
  try {
    if (input.amount !== void 0) await (0, import_guardrails.checkPaymentAmount)(invoiceId, input.amount, id);
    return await (0, import_secureClient.secureFrom)("payments").update(input).eq("id", id).select().single();
  } catch (e) {
    return asResult(null, e);
  }
}
__name(updatePayment, "updatePayment");
async function deletePayment(id) {
  return (0, import_secureClient.secureFrom)("payments").delete().eq("id", id);
}
__name(deletePayment, "deletePayment");
async function createCustomer(input) {
  return (0, import_secureClient.secureFrom)("customers").insert(input).select().single();
}
__name(createCustomer, "createCustomer");
async function updateCustomer(id, input) {
  return (0, import_secureClient.secureFrom)("customers").update(input).eq("id", id).select().single();
}
__name(updateCustomer, "updateCustomer");
async function deleteCustomer(id) {
  return (0, import_secureClient.secureFrom)("customers").delete().eq("id", id);
}
__name(deleteCustomer, "deleteCustomer");

});
