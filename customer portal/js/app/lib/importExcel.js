// lib/importExcel.js — compiled from src/lib/importExcel.ts (readable, unminified)
__modules__.define("lib/importExcel", function (module, exports, require) {
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
var importExcel_exports = {};
__export(importExcel_exports, {
  importCollections: () => importCollections,
  importDispatches: () => importDispatches,
  importInvoices: () => importInvoices,
  importPurchaseOrders: () => importPurchaseOrders,
  importSalesOrders: () => importSalesOrders
});
module.exports = __toCommonJS(importExcel_exports);
var import_exportExcel = require("./exportExcel");
var import_secureClient = require("./secureClient");
var import_supabaseClient = require("./supabaseClient");
function str(v) {
  if (v === null || v === void 0) return "";
  return String(v).trim();
}
__name(str, "str");
function num(v) {
  if (v === null || v === void 0 || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
__name(num, "num");
function dateStr(v) {
  if (v === null || v === void 0 || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const parsed = new Date(String(v));
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}
__name(dateStr, "dateStr");
async function loadCustomerMap() {
  const { data } = await import_supabaseClient.supabase.from("customers").select("id, name");
  const map = /* @__PURE__ */ new Map();
  for (const c of data || []) map.set(c.name.trim().toLowerCase(), c.id);
  return map;
}
__name(loadCustomerMap, "loadCustomerMap");
async function importPurchaseOrders(file) {
  const raw = await (0, import_exportExcel.readExcelFile)(file, "POs");
  const custMap = await loadCustomerMap();
  const result = { total: raw.length, created: 0, updated: 0, skipped: 0, errors: [] };
  const rows = [];
  const existingRes = await import_supabaseClient.supabase.from("purchase_orders").select("po_number");
  const existing = new Set((existingRes.data || []).map((r) => r.po_number));
  for (const [i, r] of raw.entries()) {
    const poNumber = str(r["PO Number"]);
    const customerName = str(r["Customer Name"]);
    if (!poNumber || !customerName) {
      result.skipped++;
      continue;
    }
    const customerId = custMap.get(customerName.toLowerCase());
    if (!customerId) {
      result.errors.push(`\u0635\u0641 ${i + 2}: \u0627\u0644\u0639\u0645\u064A\u0644 "${customerName}" \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u2014 \u0627\u0633\u062A\u0648\u0631\u062F \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0623\u0648\u0644`);
      result.skipped++;
      continue;
    }
    const poQuantity = num(r["PO Quantity"]);
    const asp = num(r["ASP"]);
    const poValue = r["PO Value"] !== void 0 && r["PO Value"] !== "" ? num(r["PO Value"]) : poQuantity * asp;
    rows.push({
      po_number: poNumber,
      customer_id: customerId,
      is_itemized: false,
      item_name: str(r["Item Name"]) || null,
      po_date: dateStr(r["PO Date"]) || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      po_quantity: poQuantity,
      asp,
      po_value: poValue,
      currency: "USD",
      status: "open"
    });
    if (existing.has(poNumber)) result.updated++;
    else result.created++;
  }
  if (rows.length > 0) {
    const { error } = await (0, import_secureClient.secureFrom)("purchase_orders").upsert(rows, { onConflict: "po_number" });
    if (error) result.errors.push(error.message);
  }
  return result;
}
__name(importPurchaseOrders, "importPurchaseOrders");
async function importSalesOrders(file) {
  const raw = await (0, import_exportExcel.readExcelFile)(file, "Sales Orders");
  const result = { total: raw.length, created: 0, updated: 0, skipped: 0, errors: [] };
  const { data: poData } = await import_supabaseClient.supabase.from("purchase_orders").select("id, po_number");
  const poMap = /* @__PURE__ */ new Map();
  for (const po of poData || []) poMap.set(po.po_number.trim().toLowerCase(), po.id);
  const { data: soData } = await import_supabaseClient.supabase.from("sales_orders").select("id, so_number, sap_so_number, factory_so_number");
  const soByKey = /* @__PURE__ */ new Map();
  for (const so of soData || []) {
    if (so.sap_so_number) soByKey.set(`sap:${so.sap_so_number.trim().toLowerCase()}`, so.id);
    if (so.factory_so_number) soByKey.set(`access:${so.factory_so_number.trim().toLowerCase()}`, so.id);
  }
  const groups = /* @__PURE__ */ new Map();
  let standaloneSeq = 0;
  for (const [i, r] of raw.entries()) {
    const poNumber = str(r["PO Number"]);
    const sapSo = str(r["SAP SO"]);
    const accessSo = str(r["Access SO"]);
    if (!poNumber) {
      result.skipped++;
      continue;
    }
    const poId = poMap.get(poNumber.trim().toLowerCase());
    if (!poId) {
      result.errors.push(`\u0635\u0641 ${i + 2}: \u0623\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621 (PO) "${poNumber}" \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u2014 \u0627\u0633\u062A\u0648\u0631\u062F POs \u0627\u0644\u0623\u0648\u0644`);
      result.skipped++;
      continue;
    }
    const soQuantity = num(r["SO Quantity"]);
    const price = num(r["U.Price"]);
    const key = sapSo ? `sap:${sapSo.toLowerCase()}` : accessSo ? `access:${accessSo.toLowerCase()}` : `standalone:${standaloneSeq++}`;
    const row = {
      poId,
      sapSo,
      accessSo,
      soDate: dateStr(r["SO Date"]),
      item: {
        product_description: str(r["Product Description"]) || null,
        proof_number: str(r["Proof"]) || null,
        version: str(r["Ver."]) || null,
        so_type: str(r["Type"]) || null,
        quantity: soQuantity,
        price
      }
    };
    groups.set(key, [...groups.get(key) || [], row]);
  }
  for (const [key, groupRows] of groups) {
    const first = groupRows[0];
    const existingId = key.startsWith("sap:") ? soByKey.get(key) : key.startsWith("access:") ? soByKey.get(key) : void 0;
    const items = groupRows.map((g) => g.item);
    const totalQty = items.reduce((s, it) => s + it.quantity, 0);
    const totalVal = items.reduce((s, it) => s + it.quantity * it.price, 0);
    const productDescription = items.length === 1 ? items[0].product_description : `${items.length} items`;
    const header = {
      po_id: first.poId,
      sap_so_number: first.sapSo || null,
      factory_so_number: first.accessSo || null,
      product_description: productDescription,
      so_date: first.soDate || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      so_quantity: totalQty,
      so_value: totalVal,
      currency: "USD",
      status: "open",
      ...existingId ? {} : { so_number: first.sapSo || first.accessSo || `SO-IMPORT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }
    };
    let soId = existingId;
    if (existingId) {
      const { error } = await (0, import_secureClient.secureFrom)("sales_orders").update(header).eq("id", existingId);
      if (error) {
        result.errors.push(error.message);
        continue;
      }
      await (0, import_secureClient.secureFrom)("so_items").delete().eq("so_id", existingId);
      result.updated += 1;
    } else {
      const { data, error } = await (0, import_secureClient.secureFrom)("sales_orders").insert(header).select().single();
      if (error || !data) {
        result.errors.push(error?.message || "insert failed");
        continue;
      }
      soId = data.id;
      result.created += 1;
    }
    const itemRows = items.map((it, idx) => ({
      so_id: soId,
      product_description: it.product_description,
      proof_number: it.proof_number,
      version: it.version,
      so_type: it.so_type,
      quantity: it.quantity,
      price: it.price,
      value: it.quantity * it.price,
      line_order: idx
    }));
    const { error: itemsError } = await (0, import_secureClient.secureFrom)("so_items").insert(itemRows);
    if (itemsError) result.errors.push(itemsError.message);
  }
  return result;
}
__name(importSalesOrders, "importSalesOrders");
async function importDispatches(file) {
  const raw = await (0, import_exportExcel.readExcelFile)(file, "Dispatches");
  const result = { total: raw.length, created: 0, updated: 0, skipped: 0, errors: [] };
  const { data: soData } = await import_supabaseClient.supabase.from("sales_orders").select("id, so_number, sap_so_number, factory_so_number");
  const soBySap = /* @__PURE__ */ new Map();
  const soByFactory = /* @__PURE__ */ new Map();
  for (const so of soData || []) {
    if (so.sap_so_number) soBySap.set(so.sap_so_number.trim().toLowerCase(), so.id);
    if (so.factory_so_number) soByFactory.set(so.factory_so_number.trim().toLowerCase(), so.id);
  }
  const { data: dispData } = await import_supabaseClient.supabase.from("dispatches").select("dispatch_number");
  const existing = new Set((dispData || []).map((r) => r.dispatch_number));
  const rows = [];
  const STATUS_MAP = { draft: "draft", shipped: "shipped", delivered: "delivered" };
  for (const [i, r] of raw.entries()) {
    const dispatchNumber = str(r["Dispatch Number"]);
    const sapSo = str(r["SAP SO"]);
    const accessSo = str(r["Access SO"]);
    if (!dispatchNumber) {
      result.skipped++;
      continue;
    }
    const soId = soBySap.get(sapSo.toLowerCase()) || soByFactory.get(accessSo.toLowerCase());
    if (!soId) {
      result.errors.push(`\u0635\u0641 ${i + 2}: \u0623\u0645\u0631 \u0627\u0644\u0628\u064A\u0639 (SO) \u0644\u0640 "${sapSo || accessSo}" \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u2014 \u0627\u0633\u062A\u0648\u0631\u062F Sales Orders \u0627\u0644\u0623\u0648\u0644`);
      result.skipped++;
      continue;
    }
    const statusRaw = str(r["Delivery Status"]).toLowerCase();
    rows.push({
      dispatch_number: dispatchNumber,
      so_id: soId,
      dispatch_quantity: num(r["Dispatch Quantity"]),
      dispatch_date: dateStr(r["Dispatch Date"]) || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      awb_tracking: str(r["AWB/Tracking"]) || null,
      status: STATUS_MAP[statusRaw] || "draft",
      delivery_date: dateStr(r["Delivery Date"])
    });
    if (existing.has(dispatchNumber)) result.updated++;
    else result.created++;
  }
  if (rows.length > 0) {
    const { error } = await (0, import_secureClient.secureFrom)("dispatches").upsert(rows, { onConflict: "dispatch_number" });
    if (error) result.errors.push(error.message);
  }
  return result;
}
__name(importDispatches, "importDispatches");
async function importInvoices(file) {
  const raw = await (0, import_exportExcel.readExcelFile)(file, "Invoices");
  const result = { total: raw.length, created: 0, updated: 0, skipped: 0, errors: [] };
  const { data: soData } = await import_supabaseClient.supabase.from("sales_orders").select("id, sap_so_number, factory_so_number");
  const soBySap = /* @__PURE__ */ new Map();
  const soByFactory = /* @__PURE__ */ new Map();
  for (const so of soData || []) {
    if (so.sap_so_number) soBySap.set(so.sap_so_number.trim().toLowerCase(), so.id);
    if (so.factory_so_number) soByFactory.set(so.factory_so_number.trim().toLowerCase(), so.id);
  }
  const { data: invData } = await import_supabaseClient.supabase.from("invoices").select("invoice_number");
  const existing = new Set((invData || []).map((r) => r.invoice_number));
  const rows = [];
  for (const [i, r] of raw.entries()) {
    const invoiceNumber = str(r["Invoice Number"]);
    const sapSo = str(r["SAP SO"]);
    const accessSo = str(r["Access SO"]);
    if (!invoiceNumber) {
      result.skipped++;
      continue;
    }
    const soId = soBySap.get(sapSo.toLowerCase()) || soByFactory.get(accessSo.toLowerCase());
    if (!soId) {
      result.errors.push(`\u0635\u0641 ${i + 2}: \u0623\u0645\u0631 \u0627\u0644\u0628\u064A\u0639 (SO) \u0644\u0640 "${sapSo || accessSo}" \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u2014 \u0627\u0633\u062A\u0648\u0631\u062F Sales Orders \u0627\u0644\u0623\u0648\u0644`);
      result.skipped++;
      continue;
    }
    rows.push({
      invoice_number: invoiceNumber,
      so_id: soId,
      product_description: str(r["Product Description"]) || null,
      invoice_quantity: num(r["Invoice Quantity"]),
      invoice_value: num(r["Invoice Value"]),
      invoice_date: dateStr(r["Invoice Date"]) || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      currency: "USD",
      status: "issued"
    });
    if (existing.has(invoiceNumber)) result.updated++;
    else result.created++;
  }
  if (rows.length > 0) {
    const { error } = await (0, import_secureClient.secureFrom)("invoices").upsert(rows, { onConflict: "invoice_number" });
    if (error) result.errors.push(error.message);
  }
  return result;
}
__name(importInvoices, "importInvoices");
async function importCollections(file) {
  const raw = await (0, import_exportExcel.readExcelFile)(file, "Collections");
  const result = { total: raw.length, created: 0, updated: 0, skipped: 0, errors: [] };
  const { data: invData } = await import_supabaseClient.supabase.from("invoices").select("id, invoice_number");
  const invMap = /* @__PURE__ */ new Map();
  for (const inv of invData || []) invMap.set(inv.invoice_number.trim().toLowerCase(), inv.id);
  const { data: payData } = await (0, import_secureClient.secureFrom)("payments").select("invoice_id, amount, payment_date");
  const existingKeys = new Set((payData || []).map((p) => `${p.invoice_id}|${Number(p.amount)}|${p.payment_date}`));
  const rows = [];
  for (const [i, r] of raw.entries()) {
    const invoiceNumber = str(r["Invoice Number"]);
    if (!invoiceNumber) {
      result.skipped++;
      continue;
    }
    const invoiceId = invMap.get(invoiceNumber.trim().toLowerCase());
    if (!invoiceId) {
      result.errors.push(`\u0635\u0641 ${i + 2}: \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 "${invoiceNumber}" \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629 \u2014 \u0627\u0633\u062A\u0648\u0631\u062F Invoices \u0627\u0644\u0623\u0648\u0644`);
      result.skipped++;
      continue;
    }
    const amount = num(r["Collected Amount"]);
    const paymentDate = dateStr(r["Collection Date"]) || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const key = `${invoiceId}|${amount}|${paymentDate}`;
    if (existingKeys.has(key)) {
      result.skipped++;
      continue;
    }
    rows.push({ invoice_id: invoiceId, amount, currency: "USD", payment_date: paymentDate });
    result.created++;
  }
  if (rows.length > 0) {
    const { error } = await (0, import_secureClient.secureFrom)("payments").insert(rows);
    if (error) result.errors.push(error.message);
  }
  return result;
}
__name(importCollections, "importCollections");

});
