// lib/repository/queries.js — compiled from src/lib/repository/queries.ts (readable, unminified)
__modules__.define("lib/repository/queries", function (module, exports, require) {
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
var queries_exports = {};
__export(queries_exports, {
  getAllPoItemsGrouped: () => getAllPoItemsGrouped,
  getAllSoItemsGrouped: () => getAllSoItemsGrouped,
  getCustomerReportAmounts: () => getCustomerReportAmounts,
  listCollections: () => listCollections,
  listCustomerReportRows: () => listCustomerReportRows,
  listDispatches: () => listDispatches,
  listInvoices: () => listInvoices,
  listOutstandingInvoices: () => listOutstandingInvoices,
  listPoSelector: () => listPoSelector,
  listPurchaseOrders: () => listPurchaseOrders,
  listSalesOrders: () => listSalesOrders,
  listSoSelector: () => listSoSelector
});
module.exports = __toCommonJS(queries_exports);
var import_supabaseClient = require("../supabaseClient");
var import_secureClient = require("../secureClient");
var import_aggregates = require("../aggregates");
async function listPurchaseOrders(opts = {}) {
  let query = import_supabaseClient.supabase.from("v_po_list").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (opts.status) query = query.eq("status", opts.status);
  if (opts.search) query = query.or(`po_number.ilike.%${opts.search}%,item_name.ilike.%${opts.search}%,customer_name.ilike.%${opts.search}%,customer_sap_code.ilike.%${opts.search}%`);
  if (opts.limit !== void 0 && opts.offset !== void 0) query = query.range(opts.offset, opts.offset + opts.limit - 1);
  const { data, error, count } = await query;
  const ids = (data || []).map((r) => r.id);
  const amounts = await getDecryptedAmountsMap("purchase_orders", ["po_quantity", "asp", "po_value"], ids);
  return {
    data: (data || []).map((r) => ({ ...r, ...amounts.get(r.id) })),
    error,
    count: count || 0
  };
}
__name(listPurchaseOrders, "listPurchaseOrders");
async function listSalesOrders(opts = {}) {
  let query = import_supabaseClient.supabase.from("v_so_list").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (opts.status) query = query.eq("status", opts.status);
  if (opts.search) query = query.or(`so_number.ilike.%${opts.search}%,sap_so_number.ilike.%${opts.search}%,po_number.ilike.%${opts.search}%,customer_name.ilike.%${opts.search}%,product_description.ilike.%${opts.search}%`);
  if (opts.limit !== void 0 && opts.offset !== void 0) query = query.range(opts.offset, opts.offset + opts.limit - 1);
  const { data, error, count } = await query;
  const ids = (data || []).map((r) => r.id);
  const amounts = await getDecryptedAmountsMap("sales_orders", ["so_quantity", "so_value"], ids);
  return {
    data: (data || []).map((r) => ({ ...r, ...amounts.get(r.id) })),
    error,
    count: count || 0
  };
}
__name(listSalesOrders, "listSalesOrders");
async function listDispatches(opts = {}) {
  let query = import_supabaseClient.supabase.from("v_dispatch_list").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (opts.status) query = query.eq("status", opts.status);
  if (opts.search) query = query.or(`dispatch_number.ilike.%${opts.search}%,so_number.ilike.%${opts.search}%,po_number.ilike.%${opts.search}%,customer_name.ilike.%${opts.search}%,awb_tracking.ilike.%${opts.search}%`);
  if (opts.limit !== void 0 && opts.offset !== void 0) query = query.range(opts.offset, opts.offset + opts.limit - 1);
  const { data, error, count } = await query;
  const ids = (data || []).map((r) => r.id);
  const amounts = await getDecryptedAmountsMap("dispatches", ["dispatch_quantity"], ids);
  return {
    data: (data || []).map((r) => ({ ...r, ...amounts.get(r.id) })),
    error,
    count: count || 0
  };
}
__name(listDispatches, "listDispatches");
async function listInvoices(opts = {}) {
  let query = import_supabaseClient.supabase.from("v_invoice_list").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (opts.status) query = query.eq("status", opts.status);
  if (opts.search) query = query.or(`invoice_number.ilike.%${opts.search}%,so_number.ilike.%${opts.search}%,customer_name.ilike.%${opts.search}%,customer_sap_code.ilike.%${opts.search}%`);
  if (opts.limit !== void 0 && opts.offset !== void 0) query = query.range(opts.offset, opts.offset + opts.limit - 1);
  const { data, error, count } = await query;
  const rows = data || [];
  const [amounts, totalsMap] = await Promise.all([
    getDecryptedAmountsMap("invoices", ["invoice_quantity", "invoice_value"], rows.map((r) => r.id)),
    (0, import_aggregates.getInvoiceTotalsMap)(rows.map((r) => r.id))
  ]);
  return {
    data: rows.map((r) => {
      const t = totalsMap.get(r.id) || { paidTotal: 0, balanceDue: 0 };
      return { ...r, ...amounts.get(r.id), paid_amount: t.paidTotal, balance_due: t.balanceDue };
    }),
    error,
    count: count || 0
  };
}
__name(listInvoices, "listInvoices");
async function listCollections(opts = {}) {
  let query = import_supabaseClient.supabase.from("v_collections_list").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (opts.search) query = query.or(`invoice_number.ilike.%${opts.search}%,customer_name.ilike.%${opts.search}%,reference_no.ilike.%${opts.search}%`);
  if (opts.limit !== void 0 && opts.offset !== void 0) query = query.range(opts.offset, opts.offset + opts.limit - 1);
  const { data, error, count } = await query;
  const ids = (data || []).map((r) => r.id);
  const amounts = await getDecryptedAmountsMap("payments", ["amount"], ids);
  return {
    data: (data || []).map((r) => ({ ...r, ...amounts.get(r.id) })),
    error,
    count: count || 0
  };
}
__name(listCollections, "listCollections");
async function getDecryptedAmountsMap(table, columns, ids) {
  const map = /* @__PURE__ */ new Map();
  if (ids.length === 0) return map;
  const { data } = await (0, import_secureClient.secureFrom)(table).select(`id, ${columns.join(", ")}`).in("id", ids);
  for (const row of data || []) {
    const out = {};
    for (const c of columns) out[c] = Number(row[c]) || 0;
    map.set(row.id, out);
  }
  return map;
}
__name(getDecryptedAmountsMap, "getDecryptedAmountsMap");
async function listOutstandingInvoices(customerId) {
  let query = (0, import_secureClient.secureFrom)("invoices").select("id, invoice_number, invoice_date, currency, status, customer_id, customers(name)").in("status", ["issued", "partially_paid", "overdue"]);
  if (customerId) query = query.eq("customer_id", customerId);
  const { data } = await query;
  const rows = data || [];
  if (rows.length === 0) return [];
  const totalsMap = await (0, import_aggregates.getInvoiceTotalsMap)(rows.map((r) => r.id));
  return rows.map((r) => ({
    id: r.id,
    invoice_number: r.invoice_number,
    invoice_date: r.invoice_date,
    currency: r.currency,
    customer_id: r.customer_id,
    customer_name: r.customers?.name || "",
    balance_due: totalsMap.get(r.id)?.balanceDue || 0
  })).filter((r) => r.balance_due > 0).sort((a, b) => b.balance_due - a.balance_due);
}
__name(listOutstandingInvoices, "listOutstandingInvoices");
async function listPoSelector(customerId) {
  let query = (0, import_secureClient.secureFrom)("purchase_orders").select("id, po_number, po_date, po_quantity, customer_id").order("po_date", { ascending: false });
  if (customerId) query = query.eq("customer_id", customerId);
  const { data } = await query;
  const rows = data || [];
  if (rows.length === 0) return [];
  const { data: soRows } = await (0, import_secureClient.secureFrom)("sales_orders").select("po_id, so_quantity").in("po_id", rows.map((r) => r.id));
  const allocated = /* @__PURE__ */ new Map();
  for (const so of soRows || []) {
    allocated.set(so.po_id, (allocated.get(so.po_id) || 0) + (Number(so.so_quantity) || 0));
  }
  return rows.map((r) => ({ id: r.id, po_number: r.po_number, po_date: r.po_date, po_quantity: Number(r.po_quantity) || 0, allocated_qty: allocated.get(r.id) || 0 }));
}
__name(listPoSelector, "listPoSelector");
async function listSoSelector(customerId) {
  let query = import_supabaseClient.supabase.from("v_so_list").select("id, so_number, sap_so_number, customer_id, po_id").order("so_date", { ascending: false });
  if (customerId) query = query.eq("customer_id", customerId);
  const { data } = await query;
  return data || [];
}
__name(listSoSelector, "listSoSelector");
async function listCustomerReportRows() {
  const { data } = await import_supabaseClient.supabase.from("v_customer_report").select("*");
  return data || [];
}
__name(listCustomerReportRows, "listCustomerReportRows");
async function getCustomerReportAmounts() {
  const [po, so, dispatch, invoice, payment] = await Promise.all([
    (0, import_secureClient.secureFrom)("purchase_orders").select("id, po_quantity, asp, po_value"),
    (0, import_secureClient.secureFrom)("sales_orders").select("id, so_quantity, so_value"),
    (0, import_secureClient.secureFrom)("dispatches").select("id, dispatch_quantity"),
    (0, import_secureClient.secureFrom)("invoices").select("id, invoice_quantity, invoice_value"),
    (0, import_secureClient.secureFrom)("payments").select("id, amount")
  ]);
  const toMap = /* @__PURE__ */ __name((rows, cols) => {
    const m = /* @__PURE__ */ new Map();
    for (const row of rows || []) {
      const out = {};
      for (const c of cols) out[c] = Number(row[c]) || 0;
      m.set(row.id, out);
    }
    return m;
  }, "toMap");
  return {
    po: toMap(po.data, ["po_quantity", "asp", "po_value"]),
    so: toMap(so.data, ["so_quantity", "so_value"]),
    dispatch: toMap(dispatch.data, ["dispatch_quantity"]),
    invoice: toMap(invoice.data, ["invoice_quantity", "invoice_value"]),
    payment: toMap(payment.data, ["amount"])
  };
}
__name(getCustomerReportAmounts, "getCustomerReportAmounts");
async function getAllPoItemsGrouped() {
  const { data } = await (0, import_secureClient.secureFrom)("po_items").select("id, po_id, item_name, quantity, price").order("line_order");
  const map = /* @__PURE__ */ new Map();
  for (const r of data || []) {
    const row = { id: r.id, po_id: r.po_id, item_name: r.item_name, quantity: Number(r.quantity) || 0, price: Number(r.price) || 0 };
    map.set(r.po_id, [...map.get(r.po_id) || [], row]);
  }
  return map;
}
__name(getAllPoItemsGrouped, "getAllPoItemsGrouped");
async function getAllSoItemsGrouped() {
  const { data } = await (0, import_secureClient.secureFrom)("so_items").select("id, so_id, product_description, proof_number, version, so_type, quantity, price").order("line_order");
  const map = /* @__PURE__ */ new Map();
  for (const r of data || []) {
    const row = {
      id: r.id,
      so_id: r.so_id,
      product_description: r.product_description,
      proof_number: r.proof_number,
      version: r.version,
      so_type: r.so_type,
      quantity: Number(r.quantity) || 0,
      price: Number(r.price) || 0
    };
    map.set(r.so_id, [...map.get(r.so_id) || [], row]);
  }
  return map;
}
__name(getAllSoItemsGrouped, "getAllSoItemsGrouped");

});
